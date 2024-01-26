const path = require("path");
const { Worker } = require("worker_threads");
const systemCpus = require("os").cpus().length;
const chalk = require("chalk");

class WebpackMultithread {
  constructor(
    webpackConfig = "",
    { cpus = 2, retries = 3, watchMode = true, watchOptions = {} } = {}
  ) {
    this.retries = retries;
    this.watchMode = watchMode;
    this.watchOptions = watchOptions;
    this.webpackConfig = webpackConfig;
    this.configs = this.loadConfig(webpackConfig);
    this.configsIds = this.configs.map((_, index) => index);
    this.configsPerCPU = this.calculateCPUs(
      this.configs.length,
      this.calculateAvailableCPUs(cpus)
    );

    this.workers = [];
  }

  loadConfig = (webpackConfig) => {
    if (webpackConfig === "") {
      console.log(
        `${chalk.yellow("[Webpack-Multithread]")} Please add path to config ❌`
      );
      process.exit();
    }
    try {
      require.resolve(webpackConfig);
      const config = require(webpackConfig);

      if (Array.isArray(config)) {
        return config;
      }

      console.log(
        `${chalk.red(
          "[Webpack-Multithread]"
        )} File: ${webpackConfig} should export an array of webpack configs ❌`
      );
      process.exit();
    } catch (e) {
      console.log(
        `${chalk.yellow(
          "[Webpack-Multithread]"
        )} Failure load config from the path: ${chalk.red(webpackConfig)} ❌`
      );
      process.exit(e.code);
    }
  };

  calculateAvailableCPUs = (cpus) => {
    if (cpus) {
      return cpus > systemCpus ? systemCpus : cpus;
    }

    return systemCpus;
  };

  calculateCPUs = (configsCount, availableCpus) => {
    if (availableCpus >= configsCount) {
      return configsCount;
    }

    return availableCpus;
  };

  run = () => {
    console.log(
      `${chalk.yellow("[Webpack-Multithread]")} Using ${chalk.blue(
        `${this.configsPerCPU} cores`
      )}`
    );
    (async () => {
      await this.runConfigs();
    })();
  };

  runConfigs = async (retryCount = 0) => {
    if (retryCount > this.retries) {
      console.log(
        `${chalk.yellow("[Webpack-Multithread]")} ${chalk.red(
          "Failure Entire building"
        )} ❌`
      );
      return;
    } else if (retryCount >= 1) {
      console.log(
        `${chalk.yellow("[Webpack-Multithread]")} Retry building ${chalk.green(
          retryCount
        )} time ⚡`
      );
    }

    const promise = this.createWorkersArray();
    const result = await Promise.allSettled(promise);

    if (result.some((value) => value.status === "rejected")) {
      this.workers.length = 0;
      await this.runConfigs(retryCount + 1);
    } else {
      console.log(
        `${chalk.yellow("[Webpack-Multithread]")} Building complete 🎉`
      );
    }
  };

  chunkIntoN = (arr, n) => {
    const size = Math.ceil(arr.length / n);
    return Array.from({ length: n }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );
  };

  createWorkersArray = () => {
    const promiseArray = [];

    this.chunkIntoN(this.configsIds, this.configsPerCPU).map((ids) => {
      promiseArray.push(
        this.executeConfigs(
          this.webpackConfig,
          ids,
          this.watchMode,
          this.watchOptions
        )
      );
    });

    return promiseArray;
  };

  executeConfigs = (webpackConfig, configIds, watchMode, watchOptions) =>
    new Promise((resolve, reject) => {
      const worker = new Worker(path.resolve(__dirname, "./worker.js"), {
        workerData: { webpackConfig, configIds, watchMode, watchOptions },
      });
      this.workers.push(worker);

      worker.on("message", () => resolve());
      worker.on("error", (error) => {
        error && console.error(error);
      });
      worker.on("exit", (code) => {
        if (code === 1) {
          this.workers.map((worker) => worker.terminate());
          this.workers.length = 0;
          reject();
        }
      });
    });
}

module.exports = WebpackMultithread;

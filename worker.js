const { workerData } = require("worker_threads");
const { performance } = require("perf_hooks");
const chalk = require("chalk");

const getWebpack = () => {
  try {
    return require(process.cwd() + "/node_modules/webpack");
  } catch (e) {
    return require("webpack");
  }
};

const getConfigName = (config) => Object.keys(config.entry)[0];

const grabConfigurations = (config, configIds) => {
  const configsNames = [];

  const configs = configIds.map((id) => {
    configsNames.push(getConfigName(config[id]));
    return config[id];
  });

  return [configs, configsNames];
};

const runCallback = (compiler, err, stats) => {
  if (err) {
    console.error(err.stack || err);

    if (err.details) {
      console.error(err.details);
    }
    return;
  }

  const info = stats.toJson();

  if (stats.hasErrors()) {
    compiler.close((closeErr) => {
      if (closeErr) {
        console.log(chalk.red(closeErr));
      }
    });
  }

  if (stats.hasWarnings()) {
    info.warnings.map((warning) => {
      if (warning.message) {
        return console.log(chalk.yellow(warning.message));
      }

      return console.log(chalk.yellow(warning));
    });
  }
};

const onCompilationDone = (
  stats,
  configName,
  thorowError = false,
  onCompleate = () => {}
) => {
  if (stats.hasErrors()) {
    const info = stats.toJson();
    const error = info.errors[0];
    console.log(
      `${chalk.yellow("[Webpack-Multithread]")} Failure building ${chalk.red(
        `${configName}`
      )} ❗`
    );
    console.log(chalk.red(error.message));

    if (thorowError) {
      throw new Error();
    }
  } else {
    onCompleate();
  }
};

const webpackProcessMultiCompiler = (
  watchMode,
  multiCompiler,
  configsNames,
  watchOptions
) => {
  if (watchMode) {
    multiCompiler.watch(watchOptions, () => {});

    multiCompiler.compilers.map((compiler, id) => {
      const onCompleate = () => {
        console.log(
          `${chalk.yellow(
            "[Webpack-Multithread]"
          )} Finish building ${chalk.green(`${configsNames[id]}`)} 🏁`
        );
      };

      compiler.hooks.done.tap("OnCompilationDone", (stats) =>
        onCompilationDone(stats, configsNames[id], false, onCompleate)
      );

      compiler.hooks.watchRun.tap("OnTriggerWatcher", () => {
        console.log(
          `${chalk.yellow("[Webpack-Multithread]")} Rebuilding ${chalk.green(
            `${configsNames[id]}`
          )} 🚩`
        );
      });
    });
  } else {
    const start = performance.now();

    multiCompiler.run((err, stats) => runCallback(multiCompiler, err, stats));

    multiCompiler.compilers.map((compiler, id) => {
      const onCompleate = () => {
        const end = performance.now();
        console.log(
          `${chalk.yellow(
            "[Webpack-Multithread]"
          )} Finish building ${chalk.green(`${configsNames[id]}`)} 🏁 in ${(
            (end - start) /
            1000
          ).toFixed(3)}s`
        );
      };

      compiler.hooks.done.tap("OnCompilationDone", (stats) =>
        onCompilationDone(stats, configsNames[id], true, onCompleate)
      );
    });
  }
};

const webpackProcessCompiler = (
  watchMode,
  compiler,
  configsName,
  watchOptions
) => {
  if (watchMode) {
    compiler.watch(watchOptions, () => {});

    const onCompleate = () => {
      console.log(
        `${chalk.yellow("[Webpack-Multithread]")} Finish building ${chalk.green(
          `${configsName}`
        )} 🏁`
      );
    };

    compiler.hooks.done.tap("OnCompilationDone", (stats) =>
      onCompilationDone(stats, configsName, false, onCompleate)
    );

    compiler.hooks.watchRun.tap("OnTriggerWatcher", () => {
      console.log(
        `${chalk.yellow("[Webpack-Multithread]")} Rebuilding ${chalk.green(
          `${configsName}`
        )} 🚩`
      );
    });
  } else {
    const start = performance.now();

    compiler.run((err, stats) => runCallback(compiler, err, stats));

    const onCompleate = () => {
      const end = performance.now();
      console.log(
        `${chalk.yellow("[Webpack-Multithread]")} Finish building ${chalk.green(
          `${configsName}`
        )} 🏁 in ${((end - start) / 1000).toFixed(3)}s`
      );
    };

    compiler.hooks.done.tap("OnCompilationDone", (stats) =>
      onCompilationDone(stats, configsName, true, onCompleate)
    );
  }
};

const { webpackConfig, configIds, watchMode, watchOptions } = workerData;

const config = require(webpackConfig);
const webpack = getWebpack();
const [configs, configsNames] = grabConfigurations(config, configIds);

if (configIds.length > 1) {
  const multiCompiler = webpack(configs);

  configsNames.map((name) =>
    console.log(
      `${chalk.yellow("[Webpack-Multithread]")} Start ${
        watchMode ? "watching" : "building"
      } ${chalk.blue(`${name}`)} 🚩`
    )
  );

  webpackProcessMultiCompiler(
    watchMode,
    multiCompiler,
    configsNames,
    watchOptions
  );
} else {
  const compiler = webpack(configs[0]);

  console.log(
    `${chalk.yellow("[Webpack-Multithread]")} Start ${
      watchMode ? "watching" : "building"
    } ${chalk.blue(`${configsNames[0]}`)} 🚩`
  );

  webpackProcessCompiler(watchMode, compiler, configsNames[0], watchOptions);
}

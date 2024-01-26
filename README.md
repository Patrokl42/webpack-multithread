# webpack-multithread

<a href="https://nodejs.org/en">
  <img src="https://img.shields.io/badge/node-%3E%3D12.9.0-brightgreen?logo=node">
</a>

<a href="https://github.com/Patrokl42/webpack-multithread">
  <img src="https://img.shields.io/badge/PRs-welcome-blue?logo=git">
</a>

Speed up your webpack build/watch speed with webpack-multithread 🚀 </br>
The webpack-multithread enables the concurrent execution of multiple webpack configurations, distributing the workload across your processors to notably accelerate the build process. </br>
It uses [worker threads](https://nodejs.org/api/worker_threads.html) to work with multithreading.

> Not comperable with [node-sass](https://www.npmjs.com/package/node-sass) ⚠️

## Get Started

Follow these steps to start using Webpack Multithread:

1. Installation

   ```sh
   # with npm
   npm i webpack-multithread --save-dev

   # with yarn
   yarn add webpack-multithread --dev

   # with pnpm
   pnpm add webpack-multithread -D
   ```

2. Create webpack.multithread.js file

   ```node
   const path = require("path");
   const WebpackMultithread = require("webpack-multithread");

   const config = path.join(__dirname, "./webpack.config.js");
   const webpackMultithread = new WebpackMultithread(config, {
     cpus: 4, // How many CPUs it may use
     retries: 2, // Retries before build fail
     watchMode: true, // Turn on/off watch mode

     // Options for webpack watcher
     // https://webpack.js.org/configuration/watch/
     watchOptions: {
       aggregateTimeout: 200,
       poll: 1000,
     },
   });

   webpackMultithread.run();
   ```

   > Your config file should export an array of configs ⚠️

3. Edit package.json

   ```json
   ...
   "scripts": {
     "start": "NODE_ENV=development node ./config/webpack.multithread.js",
     "build": "NODE_ENV=production node ./config/webpack.multithread.js"
     ...
   }
   ...
   ```

## 📝 License

[MIT](https://github.com/Patrokl42/webpack-multithread/blob/main/LICENSE)

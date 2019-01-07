const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger.js');
const app = require('./routes/app.js');
const { NODE_ENV, PORT } = require('./config.js');
const { connectDB } = require('./database.js');
const { initData, saveData, getData } = require('./models/v1/fieldStore.js');
const { initUser } = require('./models/v1/userStore.js');
const sleep = require('./util/sleep.js');
const FieldHistoryModel = require('./models/v1/FieldHistoryModel.js');

async function start() {
  await connectDB();

  swaggerSpecs.forEach(({ version, spec, option }) => {
    if (NODE_ENV === 'production' && version === 'dev') return;
    const docs = `/docs/${version}`;
    app.use(docs, swaggerUi.serve, (req, res) => {
      res.send(swaggerUi.generateHTML(spec, option));
    });
  });

  app.listen(PORT, () => {
    if (NODE_ENV === 'development') {
      /* eslint-disable no-console */
      console.log(`API Server is listening on: http://localhost:${PORT}`);
      swaggerSpecs.forEach(({ version }) => {
        console.log(`API ${version} on: http://localhost:${PORT}/docs/${version}`);
      });
      /* eslint-enable no-console */
    }
  });
  await initData();
  await initUser();

  if (getData().length === 0) {
    await new FieldHistoryModel({ x: 0, y: 0, userId: '00000000' }).save();
    await new FieldHistoryModel({ userName: 'master', userId: '00000000' }).save();
    await initData();
    await initUser();
  }

  // 検証への使用度高関数のため保存
  // await deleteData();
  // await deleteUser();

  while (true) {
    const startTime = Date.now(); // 開始時間
    await saveData();
    const endTime = Date.now(); // 終了時間
    const time = endTime - startTime;
    await sleep(time < 1000 ? 1000 - time : 0);
  }
}

start();

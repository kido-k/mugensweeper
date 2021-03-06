const chai = require('chai');
const app = require('../../../../routes/app.js');
const array2fieldHistory = require('../util/array2fieldHistory.js');
const FieldHistoryModel = require('../../../../models/v1/FieldHistoryModel.js');
const { initData, getData, addData, saveData } = require('../../../../models/v1/fieldStore.js');
const { connectDB, disconnectDB, dropDB } = require('../../../../database.js');

const ZERO00000 = 0;
const FIRST_ONE = 'u0:0:op';
const propFilter = '-_id -__v';
const time = Math.round(new Date().getTime() / 1000);

describe('field情報を返せるかどうか', () => {
  beforeAll(connectDB);
  beforeEach(initData);
  afterEach(dropDB);
  afterAll(disconnectDB);

  it('配列をfield historyに変換する関数のテスト', () => {
    // Given
    // prettier-ignore
    // param means 'u2:5:op' → userid:2, order:5, action:opened
    // action pattern → op:opened, **unset(sf:setFlag, df deleteFlag)
    const fieldHistory = array2fieldHistory([
      ZERO00000, ZERO00000, ZERO00000, 'u2:5:op', 'u1:4:op',
      ZERO00000, ZERO00000, ZERO00000, 'u3:3:op', ZERO00000,
      ZERO00000, ZERO00000, FIRST_ONE, ZERO00000, ZERO00000,
      ZERO00000, ZERO00000, 'u2:1:op', ZERO00000, ZERO00000,
      ZERO00000, 'u1:2:op', ZERO00000, ZERO00000, ZERO00000,
    ], time);

    // prettier-ignore
    const fieldHistory2 = [
      { x: 0, y: 0, userId: 0, actionId: 0, recordtime: time, action: 'opened' },
      { x: 0, y: -1, userId: 2, actionId: 1, recordtime: time,  action: 'opened',  },
      { x: -1, y: -2, userId: 1, actionId: 2, recordtime: time,  action: 'opened', },
      { x: 1, y: 1, userId: 3, actionId: 3, recordtime: time, action: 'opened' },
      { x: 2, y: 2,  userId: 1, actionId: 4, recordtime: time, action: 'opened' },
      { x: 1, y: 2, userId: 2, actionId: 5, recordtime: time, action: 'opened' },
    ];
    // Then
    expect(fieldHistory).toEqual(expect.arrayContaining(fieldHistory2));
  });

  it('DBにfieldHistoryを追加するテスト', async () => {
    // Given
    // prettier-ignore
    const fieldHistory = array2fieldHistory([
        ZERO00000, ZERO00000, ZERO00000, 'u2:5:op', 'u1:4:op',
        ZERO00000, ZERO00000, ZERO00000, 'u3:3:op', ZERO00000,
        ZERO00000, ZERO00000, FIRST_ONE, ZERO00000, ZERO00000,
        ZERO00000, ZERO00000, 'u2:1:op', ZERO00000, ZERO00000,
        ZERO00000, 'u1:2:op', ZERO00000, ZERO00000, ZERO00000,
      ], time);

    // prettier-ignore
    const add = array2fieldHistory([
        ZERO00000, 'u4:8:op', ZERO00000, ZERO00000, ZERO00000, ZERO00000, 'u1:7:op',
        ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000, 'u2:6:op',
        ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000,
        ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000,
        ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000,
        ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000,
        ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000
      ], time);

    // prettier-ignore
    const dupli = { x: 2, y: 2, userId: 4, actionId: 9,
       recordtime: time, action: 'opened', status: false, };

    // When
    const beforePostField = await FieldHistoryModel.insertMany(fieldHistory);
    await initData();
    add.forEach(addData);
    addData(dupli);
    const afterPostField = getData();
    await saveData();
    const afterSaveField = await FieldHistoryModel.find({}, propFilter).lean();

    for (let i = 0; i < add.length; i += 1) {
      await chai
        .request(app)
        .post('/v1/field')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(add[i]);
    }

    const { body } = await chai.request(app).get('/v1/field');

    // Then
    const dbMatchers = [
      { x: 0, y: 0, userId: '0', actionId: 0, recordtime: time, action: 'opened' },
      { x: 0, y: -1, userId: '2', actionId: 1, recordtime: time, action: 'opened' },
      { x: -1, y: -2, userId: '1', actionId: 2, recordtime: time, action: 'opened' },
      { x: 1, y: 1, userId: '3', actionId: 3, recordtime: time, action: 'opened' },
      { x: 2, y: 2, userId: '1', actionId: 4, recordtime: time, action: 'opened' },
      { x: 1, y: 2, userId: '2', actionId: 5, recordtime: time, action: 'opened' },
      { x: 3, y: 2, userId: '2', actionId: 6, recordtime: time, action: 'opened', status: true },
      { x: 3, y: 3, userId: '1', actionId: 7, recordtime: time, action: 'opened', status: true },
      { x: -2, y: 3, userId: '4', actionId: 8, recordtime: time, action: 'opened', status: false },
      { x: 2, y: 2, userId: '4', actionId: 9, recordtime: time, action: 'opened', status: false },
    ];

    const rsMatchers = [
      { x: 0, y: -1 },
      { x: -1, y: -2 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
    ];

    // ・DB
    expect(afterPostField).toHaveLength(beforePostField.length + 2);
    expect(afterSaveField).toHaveLength(beforePostField.length + 4);
    expect(afterSaveField).toEqual(expect.arrayContaining(dbMatchers));

    // ・Response
    const result = [];
    for (let n = 0; n < body.length; n += 1) {
      result.push({ x: body[n].x, y: body[n].y });
      expect(body[n]).toHaveProperty('bomCount');
    }
    expect(body).toHaveLength(beforePostField.length + 2);
    expect(result).toEqual(expect.arrayContaining(rsMatchers));
  });

  it('actionIdを与えずにDBに保存していく', async () => {
    // Given
    // prettier-ignore
    const fieldHistory = array2fieldHistory([
        ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000,
        ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000,
        ZERO00000, ZERO00000, FIRST_ONE, ZERO00000, ZERO00000,
        ZERO00000, ZERO00000, 'u2:2:op', ZERO00000, ZERO00000,
        ZERO00000, 'u1:1:op', ZERO00000, ZERO00000, ZERO00000,
      ], time);

    // prettier-ignore
    const add = array2fieldHistory([
        ZERO00000, ZERO00000, ZERO00000, 'u2:4:op', 'u1:3:op',
        ZERO00000, ZERO00000, ZERO00000, 'u3:5:op', ZERO00000,
        ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000,
        ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000,
        ZERO00000, ZERO00000, ZERO00000, ZERO00000, ZERO00000
      ], time);

    // When
    await FieldHistoryModel.insertMany(fieldHistory);
    await initData();
    add.forEach(addData);
    await saveData();
    const afterPostField = await FieldHistoryModel.find({}, propFilter).lean();

    // Then
    const result = [...afterPostField].sort((a, b) => a.actionId - b.actionId);
    expect(result[result.length - 1].actionId === 5);
  });
});

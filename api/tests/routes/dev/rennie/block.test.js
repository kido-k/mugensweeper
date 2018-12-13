const chai = require('chai');
const app = require('../../../../routes/app.js');

const initialBlock = () => ({
  x: 0,
  y: 0,
});

describe('前のゲーム情報のリセット処理、および、リクエスト返り値の追加テスト', () => {
  it('同じ座標にはpostしても登録されない', async () => {
    // 前のテストのBlockをサーバーから消しておく
    await chai.request(app).delete('/dev/rennie/block');
    // Given
    const positions = [{ x: 1, y: 0 }, { x: 1, y: 0 }];
    // When
    let lastBody;
    for (let i = 0; i < positions.length; i += 1) {
      const { body } = await chai
        .request(app)
        .post('/dev/rennie/block')
        .set('content-type', 'application/x-www-form-urlencoded')
        .send(positions[i]);
      lastBody = body;
    }
    // Then
    // 重複削除
    const positions2 = positions.filter(
      (v1, i1, a1) => a1.findIndex((v2) => v1.x === v2.x && v1.y === v2.y) === i1,
    );
    expect(lastBody).toHaveLength(positions2.length + 1);
    expect(lastBody).toEqual(expect.arrayContaining([initialBlock(), ...positions2]));
  });
});
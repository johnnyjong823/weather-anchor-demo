/*
 * 氣象播報體驗 — 內容設定檔
 *
 * 修改方式：只改「引號 ' ' 裡面的文字」，存檔後在瀏覽器按 F5。
 * 注意：不要刪掉引號 ' '、逗號 , 和括號 [ ] { }。
 * 改壞了：用同資料夾的 content.備份.js 內容覆蓋回來即可。
 *
 * 換圖片 / 影片：把新檔案放進 images/ 或 videos/，覆蓋同名檔案，不用改這裡。
 * 底圖（stage）可以是圖片 .jpg / .png / .gif，或影片 .mp4（自動靜音循環播放）。
 * 底圖可以放多張：stage: [ 'A', 'B' ]，每次從首頁點進去會輪流顯示下一張。
 * 底圖不是 16:9 時會完整顯示在中間，兩側自動用模糊的同一張圖填滿。
 * 說明（desc）最多 2 行、畫面標籤（labels）最多 3 個；文字太長會以 … 截斷。
 */
window.CONTENT = {
  title: '氣象播報體驗',
  subtitle: '選一張天氣圖，當一日小小氣象主播！',
  logo: 'images/logo.png',
  background: 'images/home-bg.jpg',

  charts: [
    {
      id: 'surface',
      name: '地面天氣圖',
      nameEn: 'Surface Weather Chart',
      desc: ['看懂高氣壓和低氣壓', '預測明天的天氣'],
      color: '#1F9D55',
      thumb: 'images/surface-thumb.jpg',
      stage: ['images/surface-a.png', 'images/surface-b.png'],
      labels: ['H＝高氣壓', 'L＝低氣壓']
    },
    {
      id: 'radar',
      name: '雷達回波圖',
      nameEn: 'Radar Echo',
      desc: ['看見雨正在哪裡下', '追蹤雨區的移動'],
      color: '#F07A1A',
      thumb: 'images/radar-thumb.jpg',
      stage: ['images/radar-a.png', 'images/radar-b.png']
    },
    {
      id: 'satellite',
      name: '衛星雲圖',
      nameEn: 'Satellite Image',
      desc: ['從太空看地球的雲', '發現颱風的蹤跡'],
      color: '#6B3FA0',
      thumb: 'images/satellite-thumb.jpg',
      stage: ['images/satellite-a.jpg', 'images/satellite-b.jpg'],
      labels: ['色調強化']
    },
    {
      id: 'rainfall',
      name: '累積雨量圖',
      nameEn: 'Accumulated Rainfall',
      desc: ['看看哪裡雨下得多', '提早防範豪雨災害'],
      color: '#1E9BE8',
      thumb: 'images/rainfall-thumb.jpg',
      stage: ['images/rainfall-a.jpg', 'images/rainfall-b.jpg']
    }
  ]
};

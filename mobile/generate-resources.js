const fs = require('fs');
const https = require('https');

const logoBase64 = fs.readFileSync('src/CokieHallLogo.png').toString('base64');

https.get('https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf', (res) => {
  let data = [];
  res.on('data', c => data.push(c));
  res.on('end', () => {
    const fontBase64 = Buffer.concat(data).toString('base64');
    const code = `export const logoBase64 = 'data:image/png;base64,${logoBase64}';\nexport const poppinsNormal = '${fontBase64}';`;
    fs.writeFileSync('src/utils/pdfResources.js', code);
    console.log('Resources generated successfully!');
  });
}).on('error', (e) => {
  console.error(e);
});

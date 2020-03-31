const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const cron = require('node-cron');
const csv = require("csvtojson");

const directory = __dirname + '/public/data';

async function updateFiles() {
    //clean folder
    const files = fs.readdirSync(directory)
    for (const file of files) {
        fs.unlink(path.join(directory, file), err => {
            if (err) throw err;
        });
    }

    console.log(`${directory}, cleaned`)

    //download csv
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: directory });
    await page.goto('https://airtable.com/shrd3eKa530ACUdQ4');
    await page.waitFor('.viewMenuPopover')

    const hrefElement = await page.$('.viewMenuButton[tabindex="0"]');
    await hrefElement.click();
    await page.screenshot({ path: path.join(directory, 'example.png') });
    await page.waitFor(500)

    const downloadElement = await page.$('ul.dark li[tabindex="0"]')
    await downloadElement.click()

    console.log(`download clicked`)

    await page.waitFor(6000) // wait a min
    await browser.close();

    //check for csv
    const files_downloaded = fs.readdirSync(directory)

    console.log(`files downloaded ${files_downloaded}`)
    const csv_file = files_downloaded.find(file => file.includes('.csv'))

    //rename
    await fs.renameSync(path.join(directory, csv_file), path.join(directory, 'data.csv'))

    //convert csv to geojson
    const data = await csv()
        .fromFile(path.join(directory, 'data.csv'))
        .then(function (arrayObj) {
            return {
                "type": "FeatureCollection",
                "features": arrayObj.map(item => ({
                    "type": "Feature",
                    "properties": item,
                    "geometry": {
                        "type": "Point",
                        "coordinates": [
                            +item.Longitude,
                            +item.Latitude
                        ]
                    }
                }))
            }
        })

    fs.writeFileSync(path.join(directory, 'data.geojson'), JSON.stringify(data));

    const timestamp = new Date().toLocaleString()

    const exportPage = `
    <!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Food Access Data</title>
    </head>

    <body>
        <p>Updated: ${timestamp} EST</p>
        <p><a href="/data/data.csv" target="_blank" rel="noopener noreferrer">csv</a></p>
        <p><a href="/data/data.geojson" target="_blank" rel="noopener noreferrer">geojson</a></p>
        <img src="/data/example.png"/>
    </body>

    </html>
    `

    fs.writeFileSync(path.join(__dirname + '/public', 'index.html'), exportPage);
    console.log(`done ${timestamp}`)
}

cron.schedule('*/15 * * * *', () => { // run every 15 minutes
    console.log('running a update files task');
    updateFiles()
});


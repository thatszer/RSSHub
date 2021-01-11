const got = require('@/utils/got');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const baseURL = 'https://www.ygdy8.net/index.html';

async function load(link, ctx) {
    let data = await ctx.cache.get(link);
    if (!data) {
        const response = await got.get(link, {
            responseType: 'buffer',
        });
        data = iconv.decode(response.data, 'gb2312');
    }

    const $ = cheerio.load(data);
    const description = $('div#Zoom').html();
    const title = $('.bd3l h1');
    const pubData = $.text().substr($.text().indexOf('发布时间：') + 5, 10);

    ctx.cache.set(link, $.html());

    return {
        description: description,
        title: title,
        pubDate: pubData,
    };
}

module.exports = async (ctx) => {
    const response = await got.get(baseURL, {
        responseType: 'buffer',
    });
    response.data = iconv.decode(response.data, 'gb2312');

    // logger.info(response.data);

    const $ = cheerio.load(response.data);
    // const list = $('.co_content8 table tr').get();
    const list = $('.bd3l a').get();
    // 页面含有2个.ç table
    // 仅第一个table内第一个tr元素是广告连接
    // 去除该广告连接
    list.splice(0, 1);
    // const list = $('.co_content8 table tr:not(:first-child)').get();
    const process = await Promise.all(
        list.slice(0, 20).map(async (item) => {
            // const link = $(item).find('a:nth-of-type(2)');
            const link = $(item);
            const itemUrl = 'https://www.ygdy8.net' + link.attr('href');
            const other = await load(itemUrl, ctx);

            return {
                enclosure_url: String(other.description.match(/magnet:.*?(?=">)/)),
                enclosure_type: 'application/x-bittorrent',
                title: other.title.text(),
                description: other.description,
                // pubDate: new Date($(item).find('font').text()).toUTCString(),
                pubDate: new Date(other.pubDate).toUTCString(),
                link: itemUrl,
            };
        }),
    );

    const data = {
        title: '阳光电影 最新发布',
        link: baseURL,
        description: '阳光电影 最新发布',
        item: process,
    };

    ctx.state.data = data;
};

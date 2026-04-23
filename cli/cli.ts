import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';

async function fetchHtml(url: string): Promise<string> {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    return response.text();
}

async function fetchTier(username: string): Promise<number | null> {
    try {
        const response = await fetch(`https://solved.ac/api/v3/user/show?handle=${username}`);
        if (response.ok) {
            const data = await response.json();
            return data.tier;
        }
    } catch (e) {
        // ignore errors for solved.ac API
    }
    return null;
}

async function parseUserProfile(username: string) {
    console.log(`[1/5] ${username} 유저의 프로필 정보를 가져오는 중...`);
    const infoUrl = `https://www.acmicpc.net/user/${username}`;
    const langUrl = `https://www.acmicpc.net/user/language/${username}`;

    try {
        const infoHtml = await fetchHtml(infoUrl);
        
        console.log(`[2/5] ${username} 유저의 언어 정보를 가져오는 중...`);
        const langHtml = await fetchHtml(langUrl);
        
        console.log(`[3/5] ${username} 유저의 solved.ac 티어 정보를 가져오는 중...`);
        const tier = await fetchTier(username);
        
        console.log(`[4/5] 데이터를 분석하는 중...`);
        const $info = cheerio.load(infoHtml);
        const $lang = cheerio.load(langHtml);

        // 1. ID
        const id = username;

        // 2. Status message
        let statusMessage = $info('blockquote.no-mathjax').text().trim();
        statusMessage = statusMessage.replace(/정보\s*언어$/, '').trim();

        // 3. Left Table Information
        const leftTable: Record<string, string> = {};
        $info('#statics tbody tr').each((_, el) => {
            const key = $info(el).find('th').text().trim();
            const val = $info(el).find('td').text().trim();
            if (key) leftTable[key] = val;
        });

        // 4. Grass Data (Heatmap)
        const grassData: { date: string; submit: number }[] = [];
        const scriptMatch = infoHtml.match(/const user_day_problems\s*=\s*\[([\s\S]*?)\];/);
        if (scriptMatch && scriptMatch[1]) {
            const arrStr = scriptMatch[1].trim();
            const tuples = arrStr.match(/\[\d+,\d+\]/g);
            if (tuples) {
                tuples.forEach(tuple => {
                    const parsed = JSON.parse(tuple); // e.g. [20250106, 1]
                    const dateNum = parsed[0].toString();
                    if (dateNum.length === 8) {
                        const year = dateNum.substring(0, 4);
                        const month = dateNum.substring(4, 6);
                        const day = dateNum.substring(6, 8);
                        // Convert to format like "Jan 6, 2025" or ISO string
                        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        // Save in YYYY-MM-DD for easier parsing in viewer.js later if needed
                        // Or just keep the raw representation, viewer JS might need to be adjusted
                        grassData.push({ date: `${year}-${month}-${day}`, submit: parsed[1] });
                    }
                });
            }
        }

        // 5. Solved problems & Failed problems
        const solvedProblems: string[] = [];
        const failedProblems: string[] = [];
        $info('.panel-title').each((_, el) => {
            const title = $info(el).text().trim();
            if (title === '맞은 문제' || title === '시도했지만 맞지 못한 문제') {
                const isSolved = title === '맞은 문제';
                const panelBody = $info(el).closest('.panel').find('.panel-body .problem-list a');
                panelBody.each((_, a) => {
                    if (isSolved) {
                        solvedProblems.push($info(a).text().trim());
                    } else {
                        failedProblems.push($info(a).text().trim());
                    }
                });
            }
        });

        // 6. Language Data
        const languageData: any[] = [];
        const langHeaders: string[] = [];
        $lang('.table-bordered thead th').each((_, el) => {
            langHeaders.push($lang(el).text().trim());
        });

        $lang('.table-bordered tbody tr').each((_, el) => {
            const row: Record<string, string> = {};
            $lang(el).find('th, td').each((i, td) => {
                if (langHeaders[i]) {
                    row[langHeaders[i]] = $lang(td).text().trim();
                }
            });
            if (Object.keys(row).length > 0) {
                languageData.push(row);
            }
        });

        const result = {
            id,
            tier,
            statusMessage,
            leftTable,
            grassData,
            solvedProblems,
            failedProblems,
            languageData,
            timestamp: new Date().toISOString()
        };

        const filename = require('path').join(__dirname, '..', 'data', `${username}.json`);
        await fs.writeFile(filename, JSON.stringify(result, null, 2), 'utf-8');
        console.log(`[5/5] 완료: 데이터가 성공적으로 파싱되어 data/${username}.json 파일로 저장되었습니다.`);

    } catch (error) {
        console.error(`[오류] ${username} 유저 데이터를 가져오거나 분석하는데 실패했습니다:`, error);
    }
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: bun start <username> OR npm start <username>');
    process.exit(1);
}

const targetUser = args[0];
parseUserProfile(targetUser);

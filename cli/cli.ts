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

async function fetchSolvedAcApi(username: string): Promise<any> {
    try {
        const response = await fetch(`https://solved.ac/api/v3/user/show?handle=${username}`);
        if (response.ok) {
            return await response.json();
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
        
        console.log(`[3/5] ${username} 유저의 solved.ac API 데이터를 가져오는 중...`);
        const solvedAc = await fetchSolvedAcApi(username);
        
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
            solvedAc,
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

const LOCK_FILE = require('path').join(__dirname, '..', 'data', '.run_lock');

async function checkRateLimit() {
    try {
        const lastRunStr = await fs.readFile(LOCK_FILE, 'utf-8');
        const lastRun = parseInt(lastRunStr, 10);
        if (!isNaN(lastRun)) {
            const now = Date.now();
            const diff = now - lastRun;
            if (diff < 3000) {
                console.error(`[경고] 사이트 부하 방지를 위해 연속 실행이 제한되었습니다.`);
                console.error(`=> 약 ${Math.ceil((3000 - diff) / 1000)}초 후에 다시 시도해주세요.`);
                process.exit(1);
            }
        }
    } catch (e) {
        // 파일이 없거나 읽을 수 없는 경우 무시 (첫 실행 등)
    }
    
    // 현재 시간으로 락 파일 업데이트
    try {
        await fs.writeFile(LOCK_FILE, Date.now().toString(), 'utf-8');
    } catch (e) {
        // 락 파일 작성 실패 무시
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Usage: bun start <username> OR npm start <username>');
        process.exit(1);
    }

    await checkRateLimit();

    const targetUser = args[0];
    await parseUserProfile(targetUser);
}

main();

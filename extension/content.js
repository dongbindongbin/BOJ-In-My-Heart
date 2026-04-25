console.log('[BOJ-In-My-Heart] 컨텐츠 스크립트 실행 중');

const urlParams = new URLSearchParams(window.location.search);
const isAutoExtraction = urlParams.get('auto_extract') === 'true';

if (isAutoExtraction) {
  handleAutoExtraction();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTRACT_DATA') {
    startExtractionProcess()
      .then(() => sendResponse({ success: true, redirected: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function startExtractionProcess() {
  const pathParts = window.location.pathname.split('/').filter(part => part.length > 0);
  const username = pathParts[pathParts.length - 1];

  if (!username || pathParts[0] !== 'user' || window.location.pathname.includes('language')) {
    throw new Error('백준 프로필 메인 페이지에서 실행해주세요.');
  }

  // 1. 프로필 페이지 데이터 수집
  const profileData = scrapeProfilePage(username);
  
  // 2. Solved.ac 데이터 수집 (백그라운드 위임)
  const solvedAcUrl = `https://solved.ac/api/v3/user/show?handle=${username}`;
  const solvedAcResponse = await chrome.runtime.sendMessage({ 
    action: 'FETCH_URL', 
    url: solvedAcUrl,
    responseType: 'json'
  });
  
  profileData.solvedAc = solvedAcResponse.success ? solvedAcResponse.data : null;

  // 3. 임시 저장 후 언어 페이지로 이동
  await chrome.storage.local.set({ 'temp_profile_data': profileData });
  
  const langUrl = `https://www.acmicpc.net/user/language/${username}?auto_extract=true`;
  window.location.href = langUrl;
}

async function handleAutoExtraction() {
  // 페이지 로드 대기
  await new Promise(r => setTimeout(r, 800));

  const storage = await chrome.storage.local.get('temp_profile_data');
  const profileData = storage.temp_profile_data;

  if (!profileData) return;

  // 4. 언어 데이터 수집
  const languageData = parseLanguagePageFromDOM();
  
  const finalData = {
    ...profileData,
    languageData,
    timestamp: new Date().toISOString()
  };

  // 5. 다운로드 요청 및 정리
  chrome.runtime.sendMessage({
    action: 'DOWNLOAD_JSON',
    data: finalData,
    filename: `${profileData.id}.json`
  });

  await chrome.storage.local.remove('temp_profile_data');
  alert('데이터 추출이 완료되었습니다! JSON 파일이 다운로드됩니다.');
}

function scrapeProfilePage(username) {
  // 상태 메시지
  let statusMessage = '';
  const blockquote = document.querySelector('blockquote.no-mathjax');
  if (blockquote) statusMessage = blockquote.innerText.trim().replace(/정보\s*언어$/, '').trim();

  // 왼쪽 테이블 정보
  const leftTable = {};
  document.querySelectorAll('#statics tbody tr').forEach(row => {
    const key = row.querySelector('th')?.innerText.trim();
    const val = row.querySelector('td')?.innerText.trim();
    if (key) leftTable[key] = val;
  });

  // 잔디 데이터
  const grassData = [];
  document.querySelectorAll('script').forEach(script => {
    const match = script.textContent.match(/const user_day_problems\s*=\s*\[([\s\S]*?)\];/);
    if (match && match[1]) {
      const tuples = match[1].match(/\[\d+,\d+\]/g);
      if (tuples) {
        tuples.forEach(tuple => {
          const parsed = JSON.parse(tuple);
          const dateNum = parsed[0].toString();
          if (dateNum.length === 8) {
            grassData.push({ 
              date: `${dateNum.substring(0, 4)}-${dateNum.substring(4, 6)}-${dateNum.substring(6, 8)}`, 
              submit: parsed[1] 
            });
          }
        });
      }
    }
  });

  // 문제 리스트
  const problemLists = [];
  document.querySelectorAll('.panel').forEach(panel => {
    const titleEl = panel.querySelector('.panel-title');
    const problemLinks = panel.querySelectorAll('.problem-list a');
    if (titleEl && problemLinks.length > 0) {
      const title = titleEl.innerText.trim();
      const problems = Array.from(problemLinks).map(a => a.innerText.trim());
      problemLists.push({ title, problems });
    }
  });

  return { id: username, statusMessage, leftTable, grassData, problemLists };
}

function parseLanguagePageFromDOM() {
  const languageData = [];
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
    const rows = table.querySelectorAll('tbody tr');
    if (headers.includes('언어') || headers.includes('맞았습니다')) {
      rows.forEach(row => {
        const dataRow = {};
        row.querySelectorAll('th, td').forEach((cell, i) => {
          if (headers[i]) dataRow[headers[i]] = cell.innerText.trim();
        });
        if (Object.keys(dataRow).length > 0) languageData.push(dataRow);
      });
    }
  });
  return languageData;
}

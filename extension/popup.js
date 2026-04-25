document.addEventListener('DOMContentLoaded', async () => {
  const extractBtn = document.getElementById('extract-btn');
  const statusText = document.getElementById('status-text');
  const loader = document.getElementById('loader');
  const btnLabel = document.getElementById('btn-label');
  const successMsg = document.getElementById('success-msg');
  const errorMsg = document.getElementById('error-msg');

  // 현재 탭 정보 가져오기
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab && tab.url && tab.url.includes('acmicpc.net/user/')) {
    statusText.innerText = '추출 가능';
    statusText.style.color = '#4caf50';
    extractBtn.disabled = false;
  } else {
    statusText.innerText = '잘못된 페이지';
    statusText.style.color = '#f44336';
    extractBtn.disabled = true;
    errorMsg.style.display = 'block';
    errorMsg.innerText = '백준 프로필 페이지로 이동해주세요.';
  }

  extractBtn.addEventListener('click', async () => {
    loader.style.display = 'inline-block';
    btnLabel.innerText = '추출 중...';
    extractBtn.disabled = true;
    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_DATA' });
      
      if (response && response.success) {
        if (response.redirected) {
          loader.style.display = 'none';
          btnLabel.innerText = '이동 중...';
          successMsg.style.display = 'block';
          successMsg.innerText = '언어 페이지로 이동하여 추출을 완료합니다.';
        }
      } else {
        throw new Error(response ? response.error : '알 수 없는 오류');
      }
    } catch (err) {
      console.error(err);
      loader.style.display = 'none';
      btnLabel.innerText = '데이터 추출 시작';
      extractBtn.disabled = false;
      errorMsg.style.display = 'block';
      errorMsg.innerText = `오류: ${err.message}`;
    }
  });
});

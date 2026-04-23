// Load Google Charts Calendar module
google.charts.load("current", {packages:["calendar"]});

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    
    // Allow clicking the drop zone to open file dialog
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });
});

function handleFile(file) {
    if (!file.name.endsWith('.json')) {
        alert('JSON 파일을 선택해주세요.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            renderData(data);
            document.getElementById('drop-zone').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';
        } catch (error) {
            alert('JSON 데이터 파싱 오류: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function renderData(data) {
    // 1. ID & Status Message
    document.getElementById('v-id').innerText = data.id || 'username';
    document.getElementById('v-status').innerText = data.statusMessage || '';
    
    // Tier Image
    const tierImg = document.getElementById('v-tier');
    if (data.solvedAc && data.solvedAc.tier !== undefined && data.solvedAc.tier !== null) {
        tierImg.src = `https://static.solved.ac/tier_small/${data.solvedAc.tier}.svg`;
        tierImg.style.display = 'inline-block';
    } else {
        tierImg.style.display = 'none';
    }
    
    // 2. Left Table
    const leftTableBody = document.getElementById('v-left-table');
    leftTableBody.innerHTML = '';
    for (const [key, value] of Object.entries(data.leftTable || {})) {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.innerText = key;
        const td = document.createElement('td');
        
        // Colors mapping based on BOJ style
        if (key.includes('맞은') || key.includes('맞았습니다')) {
            td.innerHTML = `<span class="result-ac">${value}</span>`;
        } else if (key.includes('틀렸습니다')) {
            td.innerHTML = `<span class="result-wa">${value}</span>`;
        } else {
            td.innerText = value;
        }
        
        tr.appendChild(th);
        tr.appendChild(td);
        leftTableBody.appendChild(tr);
    }
    
    // 3. Solved Problems
    const problemsContainer = document.getElementById('v-problems');
    problemsContainer.innerHTML = '';
    (data.solvedProblems || []).forEach(prob => {
        const a = document.createElement('a');
        a.href = `https://www.acmicpc.net/problem/${prob}`;
        a.className = 'result-ac';
        a.innerText = prob;
        a.target = '_blank';
        problemsContainer.appendChild(a);
    });

    // 3.5. Failed Problems
    const failedProblemsContainer = document.getElementById('v-failed-problems');
    failedProblemsContainer.innerHTML = '';
    (data.failedProblems || []).forEach(prob => {
        const a = document.createElement('a');
        a.href = `https://www.acmicpc.net/problem/${prob}`;
        a.className = 'result-wa'; // using WA color for failed
        a.innerText = prob;
        a.target = '_blank';
        failedProblemsContainer.appendChild(a);
    });
    
    // 4. Language Data
    const langHead = document.getElementById('v-lang-head');
    const langBody = document.getElementById('v-lang-body');
    langHead.innerHTML = '';
    langBody.innerHTML = '';
    
    if (data.languageData && data.languageData.length > 0) {
        // Headers
        const headers = Object.keys(data.languageData[0]);
        headers.forEach(h => {
            const th = document.createElement('th');
            if (h === '맞았습니다') th.innerHTML = `<span class="result-ac">${h}</span>`;
            else if (h === '틀렸습니다') th.innerHTML = `<span class="result-wa">${h}</span>`;
            else th.innerText = h;
            langHead.appendChild(th);
        });
        
        // Rows
        data.languageData.forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach((h, i) => {
                const cell = i === 0 ? document.createElement('th') : document.createElement('td');
                // Apply color classes safely, avoid html injection
                if (h === '맞았습니다') cell.innerHTML = `<span class="result-ac">${row[h] || ''}</span>`;
                else if (h === '틀렸습니다') cell.innerHTML = `<span class="result-wa">${row[h] || ''}</span>`;
                else cell.innerText = row[h] || '';
                tr.appendChild(cell);
            });
            langBody.appendChild(tr);
        });
    }
    
    // 5. Grass Data (Heatmap)
    if (data.grassData && data.grassData.length > 0) {
        google.charts.setOnLoadCallback(() => drawChart(data.grassData));
    }
}

function drawChart(grassData) {
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn({ type: 'date', id: 'Date' });
    dataTable.addColumn({ type: 'number', id: 'Submits' });
    
    const rows = [];
    grassData.forEach(item => {
        const d = new Date(item.date);
        if (!isNaN(d)) {
            rows.push([d, item.submit]);
        }
    });
    
    dataTable.addRows(rows);
    
    // 강제로 정수 표기를 위한 포맷터 적용 (소수점 방지)
    const formatter = new google.visualization.NumberFormat({ pattern: '#,###' });
    formatter.format(dataTable, 1);
    
    const chart = new google.visualization.Calendar(document.getElementById('heatmap'));
    
    // Calculate max value that is a multiple of 4 to prevent decimals on legend
    const maxSubmit = Math.max(0, ...rows.map(r => r[1]));
    const maxAxis = Math.max(4, Math.ceil(maxSubmit / 4) * 4);
    
    // 연도 개수에 따라 동적으로 차트 높이 계산 (1년당 약 130px + 여백 50px)
    const uniqueYears = new Set(rows.map(r => r[0].getFullYear()));
    const numYears = uniqueYears.size || 1;
    const dynamicHeight = numYears * 130 + 50;
    
    // Same BOJ color values
    const options = {
        title: "",
        height: dynamicHeight,
        calendar: {
            cellSize: 14,
            cellColor: { stroke: '#ffffff', strokeOpacity: 1, strokeWidth: 1 }
        },
        colorAxis: {
            minValue: 0,
            maxValue: maxAxis,
            values: [0, maxAxis],
            colors: ['#AEF59A', '#11823b']
        }
    };
    
    chart.draw(dataTable, options);
}

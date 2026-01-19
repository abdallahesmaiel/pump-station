const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// „Ã·œ ·Õ›Ÿ «·»Ì«‰« 
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// „”«— „·› «·»Ì«‰« 
const DATA_FILE = path.join(DATA_DIR, 'stations.json');

// «· Œ“Ì‰ ›Ì «·–«ﬂ—…
let stationData = {};

//  Õ„Ì· «·»Ì«‰«  „‰ «·„·› ≈–« ÊÃœ
if (fs.existsSync(DATA_FILE)) {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        stationData = JSON.parse(data);
        console.log(' „  Õ„Ì· «·»Ì«‰«  „‰ «·„·›');
    } catch (error) {
        console.error('Œÿ√ ›Ì  Õ„Ì· «·»Ì«‰« :', error);
    }
}

// Õ›Ÿ «·»Ì«‰«  ›Ì «·„·›
function saveToFile() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(stationData, null, 2));
        console.log(' „ Õ›Ÿ «·»Ì«‰«  ›Ì «·„·›');
    } catch (error) {
        console.error('Œÿ√ ›Ì Õ›Ÿ «·»Ì«‰« :', error);
    }
}

// ‰ﬁÿ… «·‰Â«Ì… ··„“«„‰…
app.post('/sync', (req, res) => {
    try {
        const { stations, deviceId, timestamp } = req.body;
        
        console.log(`?? «” ﬁ»«· »Ì«‰«  „‰ «·ÃÂ«“: ${deviceId} - ${new Date(timestamp).toLocaleString('ar-SA')}`);
        
        // œ„Ã «·»Ì«‰«  «·„” ·„… „⁄ «·»Ì«‰«  «·„ÊÃÊœ…
        for (const [stationName, records] of Object.entries(stations)) {
            if (!stationData[stationName]) {
                stationData[stationName] = [];
            }
            
            // ≈÷«›… «·”Ã·«  «·ÃœÌœ…
            records.forEach(newRecord => {
                const exists = stationData[stationName].some(
                    existingRecord => existingRecord.savedAt === newRecord.savedAt
                );
                
                if (!exists) {
                    stationData[stationName].push(newRecord);
                }
            });
            
            //  — Ì» «·”Ã·«  Õ”» «· «—ÌŒ («·√ÕœÀ √Ê·«)
            stationData[stationName].sort((a, b) => 
                new Date(b.savedAt) - new Date(a.savedAt)
            );
            
            // «·«Õ ›«Ÿ »‹ 50 ”Ã· ›ﬁÿ ·ﬂ· „Õÿ…
            if (stationData[stationName].length > 50) {
                stationData[stationName] = stationData[stationName].slice(0, 50);
            }
        }
        
        // Õ›Ÿ ›Ì «·„·›
        saveToFile();
        
        // ≈—”«· Ã„Ì⁄ «·»Ì«‰«  «·„Œ“‰… ›Ì «·Œ«œ„
        res.json({
            success: true,
            message: ' „  «·„“«„‰… »‰Ã«Õ',
            stations: stationData,
            serverTime: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Œÿ√ ›Ì „⁄«·Ã… «·ÿ·»:', error);
        res.status(500).json({
            success: false,
            message: 'ÕœÀ Œÿ√ ›Ì «·Œ«œ„'
        });
    }
});

// ‰ﬁÿ… «·‰Â«Ì… ··Õ’Ê· ⁄·Ï «·»Ì«‰« 
app.get('/stations', (req, res) => {
    res.json({
        success: true,
        stations: stationData,
        count: Object.keys(stationData).length,
        lastUpdate: new Date().toISOString()
    });
});

// ‰ﬁÿ… «·‰Â«Ì… ··Õ’Ê· ⁄·Ï „Õÿ… „Õœœ…
app.get('/station/:name', (req, res) => {
    const stationName = req.params.name;
    
    if (stationData[stationName]) {
        res.json({
            success: true,
            stationName,
            records: stationData[stationName]
        });
    } else {
        res.json({
            success: false,
            message: '«·„Õÿ… €Ì— „ÊÃÊœ…'
        });
    }
});

// ‰ﬁÿ… «·‰Â«Ì… ·Õ–› „Õÿ…
app.delete('/station/:name', (req, res) => {
    const stationName = req.params.name;
    
    if (stationData[stationName]) {
        delete stationData[stationName];
        saveToFile();
        res.json({
            success: true,
            message: ` „ Õ–› „Õÿ… ${stationName}`
        });
    } else {
        res.json({
            success: false,
            message: '«·„Õÿ… €Ì— „ÊÃÊœ…'
        });
    }
});

// ‰ﬁÿ… «·‰Â«Ì… ··Õ’Ê· ⁄·Ï «·≈Õ’«∆Ì« 
app.get('/stats', (req, res) => {
    const stats = {
        totalStations: Object.keys(stationData).length,
        totalRecords: 0,
        stations: []
    };
    
    for (const [stationName, records] of Object.entries(stationData)) {
        stats.totalRecords += records.length;
        stats.stations.push({
            name: stationName,
            recordCount: records.length,
            lastUpdate: records.length > 0 ? records[0].savedAt : null
        });
    }
    
    res.json(stats);
});

// ‰ﬁÿ… «·‰Â«Ì… ··’Õ…
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// ‰ﬁÿ… «·‰Â«Ì… «·—∆Ì”Ì…
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Œ«œ„ „Õÿ«  «·÷Œ</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #2c3e50; }
                .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
            </style>
        </head>
        <body>
            <h1>?? Œ«œ„ „Õÿ«  «·÷Œ</h1>
            <p>«·Œ«œ„ Ì⁄„· »‰Ã«Õ ⁄·Ï «·„‰›– ${PORT}</p>
            <p>‰ﬁ«ÿ «·‰Â«Ì… «·„ «Õ…:</p>
            <div class="endpoint"><strong>POST /sync</strong> - „“«„‰… «·»Ì«‰« </div>
            <div class="endpoint"><strong>GET /stations</strong> - ⁄—÷ Ã„Ì⁄ «·„Õÿ« </div>
            <div class="endpoint"><strong>GET /station/:name</strong> - »Ì«‰«  „Õÿ… „Õœœ…</div>
            <div class="endpoint"><strong>GET /stats</strong> - ≈Õ’«∆Ì«  «·Œ«œ„</div>
            <div class="endpoint"><strong>GET /health</strong> - Õ«·… «·Œ«œ„</div>
        </body>
        </html>
    `);
});

// »œ¡ «·Œ«œ„
app.listen(PORT, '0.0.0.0', () => {
    console.log(`? «·Œ«œ„ Ì⁄„· ⁄·Ï: http://localhost:${PORT}`);
    console.log(`?? Ì„ﬂ‰ «·Ê’Ê· ⁄»— «·‘»ﬂ… «·„Õ·Ì…`);
});
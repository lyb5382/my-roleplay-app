require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 세팅 (나중에 프론트랑 통신할 때 CORS 에러로 좆되는 거 방지)
app.use(cors());
app.use(express.json());

// 몽고디비 연결
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('🔥 씨발 몽고디비 연결 성공! DB 숨 쉰다!'))
    .catch((err) => console.error('❌ DB 연결 좆됨:', err));

// 테스트용 기본 라우터
app.get('/', (req, res) => {
    res.send('잼스 백엔드 서버 존나 쌩쌩하게 돌아가는 중 🚀');
});

// 라우터 불러오기
const chatRoutes = require('./routes/chat');
const characterRoutes = require('./routes/character');
const personaRoutes = require('./routes/persona');
const sessionRoutes = require('./routes/session');

// 라우터 적용
app.use('/api/chat', chatRoutes);
app.use('/api/character', characterRoutes);
app.use('/api/persona', personaRoutes);
app.use('/api/session', sessionRoutes);

// 서버 실행
app.listen(PORT, () => {
    console.log(`✅ 서버 포트 ${PORT}에서 켜짐. 브라우저에서 http://localhost:${PORT} 드가봐라`);
});
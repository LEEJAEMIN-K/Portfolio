const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 메모리에 전체 주문 상태 유지
let orders = [];

io.on('connection', (socket) => {
  console.log('🔗 클라이언트 연결됨:', socket.id);

  // 접속 시 현재 모든 주문 목록 전달
  socket.emit('init-orders', orders);

  // 1. 손님이 새 주문을 전송했을 때
  socket.on('new-order', (orderData) => {
    const newOrder = {
      id: Date.now().toString().slice(-4),
      tableNum: orderData.tableNum,
      items: orderData.items,
      totalPrice: orderData.totalPrice,
      totalTime: orderData.totalTime,
      status: 'PAYMENT_COMPLETE', // 기본 상태: 결제 완료
      createdAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };

    orders.push(newOrder);
    console.log('📥 새 주문 접수:', newOrder);

    // 전체 클라이언트(주방 포함)에 업데이트 전파
    io.emit('order-updated', orders);
  });

  // 2. 주방에서 상태 변경을 요청했을 때 (조리 시작, 조리 완료)
  socket.on('update-status', ({ orderId, status }) => {
    const order = orders.find(o => o.id == orderId);
    if (order) {
      order.status = status;
      io.emit('order-updated', orders);
    }
  });

  // 3. 주방에서 카드 삭제를 요청했을 때
  socket.on('remove-order', (orderId) => {
    orders = orders.filter(o => o.id != orderId);
    io.emit('order-updated', orders);
  });

  socket.on('disconnect', () => {
    console.log('❌ 클라이언트 연결 해제:', socket.id);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 백엔드 서버가 http://localhost:${PORT} 에서 작동 중입니다.`);
});
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Melayani file statis (HTML, CSS, JS)
app.use(express.static(__dirname));

// Data State (Dalam produksi, gunakan Database seperti MongoDB/PostgreSQL)
let tasks = [];
let submissions = [];
let users = [];

io.on('connection', (socket) => {
    console.log('User terhubung:', socket.id);

    // Kirim data awal ke user yang baru join
    socket.emit('initData', { tasks, submissions });

    // Handle Buat Tugas (Admin)
    socket.on('createTask', (newTask) => {
        tasks.unshift(newTask);
        // Broadcast ke SEMUA user termasuk pengirim
        io.emit('taskUpdated', tasks);
    });

    // Handle Pengumpulan Tugas (Siswa)
    socket.on('submitTask', (newSubmission) => {
        // Hapus pengumpulan lama jika ada (update)
        submissions = submissions.filter(s => 
            !(s.tugasId === newSubmission.tugasId && s.siswaId === newSubmission.siswaId)
        );
        submissions.push(newSubmission);
        
        // Broadcast data terbaru ke semua user
        io.emit('submissionUpdated', submissions);
    });

    // Handle Hapus Tugas
    socket.on('deleteTask', (taskId) => {
        tasks = tasks.filter(t => t.id !== taskId);
        submissions = submissions.filter(s => s.tugasId !== taskId);
        io.emit('taskUpdated', tasks);
        io.emit('submissionUpdated', submissions);
    });

    socket.on('disconnect', () => {
        console.log('User terputus');
    });
});

const PORT = process.env.PORT || 3100;
server.listen(PORT, () => {
    console.log(`Server KelasKu berjalan di http://localhost:${PORT}`);
});
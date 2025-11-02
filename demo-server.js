const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend/out')));

// Mock data for demo
const mockData = {
  users: [
    {
      user_id: '1',
      name: 'John Doe',
      email: 'admin@college.edu',
      role: 'admin',
      department: 'Computer Science'
    },
    {
      user_id: '2',
      name: 'Jane Smith',
      email: 'faculty@college.edu',
      role: 'faculty',
      department: 'Computer Science'
    },
    {
      user_id: '3',
      name: 'Mike Johnson',
      email: 'student@college.edu',
      role: 'student',
      department: 'Computer Science',
      roll_number: 'CS2021001'
    }
  ],
  classes: [
    {
      class_id: '1',
      subject: 'Database Systems',
      code: 'CS301',
      faculty: 'Jane Smith',
      time: '10:00 AM',
      room: 'Lab 301',
      attendance_marked: false,
      total_students: 45
    },
    {
      class_id: '2',
      subject: 'Web Development',
      code: 'CS302',
      faculty: 'Jane Smith',
      time: '2:00 PM',
      room: 'Lab 302',
      attendance_marked: true,
      total_students: 38
    }
  ],
  permissions: [
    {
      permission_id: '1',
      student: 'Mike Johnson',
      reason: 'Medical appointment',
      start_date: '2024-01-15',
      end_date: '2024-01-15',
      status: 'pending',
      proof_file: '/uploads/medical_proof.pdf'
    },
    {
      permission_id: '2',
      student: 'Sarah Wilson',
      reason: 'College competition',
      start_date: '2024-01-20',
      end_date: '2024-01-22',
      status: 'approved',
      approved_by: 'Jane Smith'
    }
  ],
  clubs: [
    {
      club_id: '1',
      name: 'Coding Club',
      description: 'Programming and coding competitions',
      incharge: 'Dr. Robert Brown',
      active_members: 25,
      upcoming_events: 2
    },
    {
      club_id: '2',
      name: 'Robotics Club',
      description: 'Building and programming robots',
      incharge: 'Prof. Alice Davis',
      active_members: 18,
      upcoming_events: 1
    }
  ],
  achievements: [
    {
      achievement_id: '1',
      student: 'Mike Johnson',
      title: 'First Prize - Hackathon 2024',
      type: 'technical',
      level: 'college',
      organization: 'Tech Fest',
      date: '2024-01-10',
      status: 'verified',
      verified_by: 'Jane Smith'
    }
  ]
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'demo',
    version: '1.0.0'
  });
});

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Mock authentication
  const user = mockData.users.find(u => u.email === email);

  if (user && (password === 'admin123' || password === 'faculty123' || password === 'student123')) {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        tokens: {
          accessToken: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token'
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

app.get('/api/auth/profile', (req, res) => {
  res.json({
    success: true,
    data: { user: mockData.users[0] }
  });
});

// User routes
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    data: { users: mockData.users }
  });
});

// Attendance routes
app.get('/api/attendance/classes', (req, res) => {
  res.json({
    success: true,
    data: {
      classes: mockData.classes,
      date: new Date().toISOString().split('T')[0]
    }
  });
});

app.post('/api/attendance/mark', (req, res) => {
  const { class_id, date, attendance } = req.body;

  // Mock attendance marking
  res.json({
    success: true,
    message: `Attendance marked for ${attendance.length} students`,
    data: {
      markedCount: attendance.length,
      date,
      class: mockData.classes.find(c => c.class_id === class_id)
    }
  });
});

// Permission routes
app.get('/api/permissions', (req, res) => {
  res.json({
    success: true,
    data: { permissions: mockData.permissions }
  });
});

// Club routes
app.get('/api/clubs', (req, res) => {
  res.json({
    success: true,
    data: { clubs: mockData.clubs }
  });
});

// Achievement routes
app.get('/api/achievements', (req, res) => {
  res.json({
    success: true,
    data: { achievements: mockData.achievements }
  });
});

// Analytics routes
app.get('/api/analytics/dashboard/attendance', (req, res) => {
  res.json({
    success: true,
    data: {
      overall: {
        total_classes: 5,
        present_count: 185,
        absent_count: 15,
        permission_count: 8,
        unique_students: 45,
        overall_attendance_percentage: 89.2
      },
      trends: [
        { date: '2024-01-10', attendance_percentage: 92.5 },
        { date: '2024-01-11', attendance_percentage: 87.3 },
        { date: '2024-01-12', attendance_percentage: 90.1 }
      ]
    }
  });
});

// Serve frontend if it exists
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 College Management System Demo Server running on port ${PORT}`);
  console.log(`📚 Backend API: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`\n📋 Demo Login Credentials:`);
  console.log(`👨‍💼 Admin: admin@college.edu / admin123`);
  console.log(`👩‍🏫 Faculty: faculty@college.edu / faculty123`);
  console.log(`👨‍🎓 Student: student@college.edu / student123`);
  console.log(`\n🌐 Try these API endpoints:`);
  console.log(`• GET http://localhost:${PORT}/api/health`);
  console.log(`• POST http://localhost:${PORT}/api/auth/login`);
  console.log(`• GET http://localhost:${PORT}/api/users`);
  console.log(`• GET http://localhost:${PORT}/api/attendance/classes`);
  console.log(`• GET http://localhost:${PORT}/api/permissions`);
  console.log(`• GET http://localhost:${PORT}/api/clubs`);
  console.log(`• GET http://localhost:${PORT}/api/achievements`);
  console.log(`• GET http://localhost:${PORT}/api/analytics/dashboard/attendance`);
});
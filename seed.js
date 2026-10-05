const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./server/models/User');
const Course = require('./server/models/Course');
const Offering = require('./server/models/Offering');
const Record = require('./server/models/Record');
const Registration = require('./server/models/Registration');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Error: MONGO_URI is not defined in your .env file.');
  process.exit(1);
}

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully.');

    // 1. Clear existing collection data
    console.log('Clearing existing database collections...');
    await Promise.all([
      User.deleteMany({}),
      Course.deleteMany({}),
      Offering.deleteMany({}),
      Record.deleteMany({}),
      Registration.deleteMany({})
    ]);

    // 2. Hash default password for all test accounts
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 3. Create Admin Account
    await User.create({
      name: 'System Admin',
      email: 'admin@demo.edu',
      passwordHash: hashedPassword,
      role: 'admin',
      active: true
    });

    // 4. Create 4 Advisor Accounts
    const advisors = [];
    for (let i = 1; i <= 4; i++) {
      advisors.push({
        name: `Advisor ${i}`,
        email: `advisor${i}@demo.edu`,
        passwordHash: hashedPassword,
        role: 'advisor',
        advisorId: `ADV0${i}`,
        active: true
      });
    }
    await User.insertMany(advisors);

    // 5. Create 25 Anonymized Student Accounts
    const studentData = [];
    for (let i = 1; i <= 25; i++) {
      const idNum = String(i).padStart(2, '0');
      studentData.push({
        name: `Student ${idNum}`,
        email: `stu690${idNum}@demo.edu`,
        passwordHash: hashedPassword,
        role: 'student',
        studentId: `STU690${idNum}`,
        active: true
      });
    }
    const createdStudents = await User.insertMany(studentData);

    // 6. Create Course Catalog
    const courseCatalog = [
      { code: 'CSC101', title: 'Programming I', credits: 4, description: 'Introduction to fundamentals of programming.' },
      { code: 'CSC102', title: 'Programming II', credits: 4, description: 'Object-oriented programming and data structures.' },
      { code: 'CSC220', title: 'Web Development II', credits: 4, description: 'Full-stack MERN web application development.' },
      { code: 'ITE210', title: 'Database Systems', credits: 4, description: 'Relational and document-based database design.' },
      { code: 'GEN101', title: 'Academic English', credits: 3, description: 'English communication for academic success.' },
      { code: 'MTH110', title: 'Discrete Mathematics', credits: 3, description: 'Logic, sets, functions, and graph theory.' }
    ];
    const createdCourses = await Course.insertMany(courseCatalog);

    // Map course code to ObjectId
    const courseMap = {};
    createdCourses.forEach(c => {
      courseMap[c.code] = c._id;
    });

    // 7. Create Offerings for Term 2026-1
    const offeringsData = [
      {
        courseId: courseMap['CSC220'],
        term: '2026-1',
        section: 1,
        day: 'Monday',
        startTime: '09:00',
        endTime: '12:00',
        room: 'Room 401',
        instructor: 'Dr. Smith',
        seats: 30,
        seatsTaken: 12,
        addDropOpen: true
      },
      {
        courseId: courseMap['ITE210'],
        term: '2026-1',
        section: 1,
        day: 'Tuesday',
        startTime: '09:00',
        endTime: '12:00',
        room: 'Room 302',
        instructor: 'Prof. Davis',
        seats: 25,
        seatsTaken: 25,
        addDropOpen: false
      },
      {
        courseId: courseMap['CSC102'],
        term: '2026-1',
        section: 1,
        day: 'Monday',
        startTime: '10:00',
        endTime: '13:00',
        room: 'Lab 2',
        instructor: 'Ajarn Lee',
        seats: 30,
        seatsTaken: 5,
        addDropOpen: false
      },
      {
        courseId: courseMap['GEN101'],
        term: '2026-1',
        section: 1,
        day: 'Wednesday',
        startTime: '13:00',
        endTime: '16:00',
        room: 'Room 101',
        instructor: 'Dr. Taylor',
        seats: 40,
        seatsTaken: 10,
        addDropOpen: false
      },
      {
        courseId: courseMap['MTH110'],
        term: '2026-1',
        section: 1,
        day: 'Thursday',
        startTime: '09:00',
        endTime: '12:00',
        room: 'Room 205',
        instructor: 'Dr. Brown',
        seats: 35,
        seatsTaken: 15,
        addDropOpen: false
      }
    ];
    const createdOfferings = await Offering.insertMany(offeringsData);

    // 8. Create Historical Transcript Records
    const recordsData = [];

    // Student 1 (STU69001): Failed CSC101
    recordsData.push({
      studentId: createdStudents[0]._id,
      courseId: courseMap['CSC101'],
      term: '2025-2',
      grade: 'F'
    });

    // Students 2 to 25: Standard passing records
    for (let i = 1; i < createdStudents.length; i++) {
      recordsData.push(
        { studentId: createdStudents[i]._id, courseId: courseMap['CSC101'], term: '2025-1', grade: 'B+' },
        { studentId: createdStudents[i]._id, courseId: courseMap['GEN101'], term: '2025-2', grade: 'A' }
      );
    }
    const createdRecords = await Record.insertMany(recordsData);

    console.log('\n================================================--');
    console.log('Seeding completed successfully:');
    console.log(`  25 students, 4 advisors, 1 admin created`);
    console.log(`  ${createdCourses.length} courses, ${createdOfferings.length} sections created for term 2026-1`);
    console.log(`  ${createdRecords.length} completed-course records created`);
    console.log('================================================--\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed with error:', error);
    process.exit(1);
  }
}

seed();
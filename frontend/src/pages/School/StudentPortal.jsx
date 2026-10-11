import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Table,
  Statistic,
  Tabs,
  Badge,
  Avatar,
  Space,
  Divider,
  Progress,
  Button,
} from 'antd';
import {
  IdcardOutlined,
  CalendarOutlined,
  TrophyOutlined,
  DollarCircleOutlined,
  NotificationOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { schoolService } from '@/services/schoolService';
import storePersist from '@/redux/storePersist';

const { Title, Text, Paragraph } = Typography;

export default function StudentPortal() {
  const [student, setStudent] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [reportCard, setReportCard] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [notices, setNotices] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPortal = async () => {
      setLoading(true);
      try {
        const auth = storePersist.get('auth');
        const currentUser = auth?.current;

        // Fetch students list to get student details
        const stuRes = await schoolService.list('student');
        let currentStudent = stuRes.result?.[0]; // Default to first student (Alex Morgan)
        if (currentUser?.studentRef) {
          const match = stuRes.result?.find((s) => s._id === currentUser.studentRef);
          if (match) currentStudent = match;
        }
        setStudent(currentStudent);

        if (currentStudent) {
          const [attRes, repRes, feeRes, notRes, ttRes] = await Promise.all([
            schoolService.getStudentAttendance(currentStudent._id),
            schoolService.getStudentReportCard(currentStudent._id),
            schoolService.getStudentBalance(currentStudent._id),
            schoolService.getNoticeFeed(),
            schoolService.list('timetable', { schoolClass: currentStudent.schoolClass?._id }),
          ]);

          if (attRes.success) setAttendanceData(attRes.result);
          if (repRes.success) setReportCard(repRes.result);
          if (feeRes.success) setFeeData(feeRes.result);
          if (notRes.success) setNotices(notRes.result || []);
          if (ttRes.success) setTimetable(ttRes.result || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadPortal();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Student Profile Card Header */}
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
          color: '#ffffff',
          marginBottom: 24,
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
        }}
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} sm={6} style={{ textAlign: 'center' }}>
            <Avatar
              size={100}
              style={{ backgroundColor: '#2563eb', fontSize: 36, border: '3px solid #60a5fa' }}
            >
              {student?.name?.[0] || 'A'}
            </Avatar>
            <div style={{ marginTop: 10 }}>
              <Tag color="cyan">ROLL #{student?.rollNumber || '101'}</Tag>
            </div>
          </Col>

          <Col xs={24} sm={18}>
            <Title level={2} style={{ color: '#ffffff', margin: 0 }}>
              {student ? `${student.name} ${student.surname}` : 'Alex Morgan'}
            </Title>
            <Text style={{ color: '#93c5fd', fontSize: 16 }}>
              Student at Campus Academy | {student?.schoolClass?.name || 'Grade 10'} - {student?.section?.name || 'Section A'}
            </Text>

            <Divider style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '14px 0' }} />

            <Row gutter={[16, 8]}>
              <Col xs={24} sm={8}>
                <Text style={{ color: '#cbd5e1' }}>Admission Number: </Text>
                <Text strong style={{ color: '#ffffff' }}>{student?.admissionNumber || 'ADM-2026-001'}</Text>
              </Col>
              <Col xs={24} sm={8}>
                <Text style={{ color: '#cbd5e1' }}>Guardian: </Text>
                <Text strong style={{ color: '#ffffff' }}>{student?.guardianName || 'David Morgan'}</Text>
              </Col>
              <Col xs={24} sm={8}>
                <Text style={{ color: '#cbd5e1' }}>Academic Standing: </Text>
                <Tag color="green">Good Standing</Tag>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Stats summary row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="Attendance Rate"
              value={attendanceData?.attendanceRate ?? 96}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="Academic GPA"
              value={reportCard?.overallGrade || 'A+'}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="Fee Balance Due"
              value={feeData?.balance ?? 0}
              prefix="$"
              valueStyle={{ color: feeData?.balance > 0 ? '#dc2626' : '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="Active Notices"
              value={notices.length}
              prefix={<NotificationOutlined />}
              valueStyle={{ color: '#7c3aed' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="results"
        items={[
          {
            key: 'results',
            label: 'Examination Report & Grades',
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Title level={4} style={{ margin: 0 }}>Mid-Term Assessment Transcript</Title>
                  <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print Report</Button>
                </div>

                <Table
                  dataSource={reportCard?.results || []}
                  rowKey="_id"
                  pagination={false}
                  columns={[
                    {
                      title: 'Subject',
                      dataIndex: 'subject',
                      key: 'subject',
                      render: (s) => <Text strong>{s?.name || 'Subject'}</Text>,
                    },
                    {
                      title: 'Max Marks',
                      dataIndex: 'maxMarks',
                      key: 'maxMarks',
                    },
                    {
                      title: 'Marks Obtained',
                      dataIndex: 'marksObtained',
                      key: 'marksObtained',
                      render: (m) => <Text strong style={{ color: '#0369a1' }}>{m}</Text>,
                    },
                    {
                      title: 'Grade',
                      dataIndex: 'grade',
                      key: 'grade',
                      render: (g) => <Tag color="blue" style={{ fontSize: 13, fontWeight: 'bold' }}>{g}</Tag>,
                    },
                    {
                      title: 'Teacher Remarks',
                      dataIndex: 'remarks',
                      key: 'remarks',
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'attendance',
            label: 'Attendance History',
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                  dataSource={attendanceData?.records || []}
                  rowKey="_id"
                  pagination={{ pageSize: 10 }}
                  columns={[
                    {
                      title: 'Date',
                      dataIndex: 'date',
                      key: 'date',
                      render: (d) => dayjs(d).format('YYYY-MM-DD (dddd)'),
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (st) => <Tag color={st === 'Present' ? 'green' : 'red'}>{st}</Tag>,
                    },
                    {
                      title: 'Remarks',
                      dataIndex: 'remarks',
                      key: 'remarks',
                      render: (r) => r || 'Regular',
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'fees',
            label: 'Fee Statement & Receipts',
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Title level={5}>Payment Receipts</Title>
                <Table
                  dataSource={feeData?.payments || []}
                  rowKey="_id"
                  pagination={false}
                  columns={[
                    {
                      title: 'Receipt #',
                      dataIndex: 'receiptNumber',
                      key: 'receiptNumber',
                      render: (r) => <Tag color="cyan">{r}</Tag>,
                    },
                    {
                      title: 'Amount Paid',
                      dataIndex: 'amountPaid',
                      key: 'amountPaid',
                      render: (amt) => <Text strong style={{ color: '#16a34a' }}>${amt?.toLocaleString()}</Text>,
                    },
                    {
                      title: 'Payment Method',
                      dataIndex: 'paymentMethod',
                      key: 'paymentMethod',
                    },
                    {
                      title: 'Payment Date',
                      dataIndex: 'paymentDate',
                      key: 'paymentDate',
                      render: (d) => dayjs(d).format('YYYY-MM-DD'),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'notices',
            label: 'Campus Bulletins',
            children: (
              <Row gutter={[16, 16]}>
                {notices.map((n) => (
                  <Col xs={24} md={12} key={n._id}>
                    <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <Tag color="blue">{n.category}</Tag>
                      <Title level={5} style={{ margin: '8px 0' }}>{n.title}</Title>
                      <Paragraph style={{ color: '#475569', fontSize: 13 }}>{n.content}</Paragraph>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        By {n.author} • {dayjs(n.publishDate).format('MMM D, YYYY')}
                      </Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
}

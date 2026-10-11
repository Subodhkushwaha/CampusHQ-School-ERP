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
  Avatar,
  Space,
  Divider,
  Button,
} from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  DollarCircleOutlined,
  PrinterOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { schoolService } from '@/services/schoolService';

const { Title, Text, Paragraph } = Typography;

export default function ParentPortal() {
  const [child, setChild] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [reportCard, setReportCard] = useState(null);
  const [feeData, setFeeData] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadParentData = async () => {
      setLoading(true);
      try {
        const stuRes = await schoolService.list('student');
        const linkedChild = stuRes.result?.[0]; // Default linked child Alex Morgan
        setChild(linkedChild);

        if (linkedChild) {
          const [attRes, repRes, feeRes, notRes] = await Promise.all([
            schoolService.getStudentAttendance(linkedChild._id),
            schoolService.getStudentReportCard(linkedChild._id),
            schoolService.getStudentBalance(linkedChild._id),
            schoolService.getNoticeFeed(),
          ]);

          if (attRes.success) setAttendance(attRes.result);
          if (repRes.success) setReportCard(repRes.result);
          if (feeRes.success) setFeeData(feeRes.result);
          if (notRes.success) setNotices(notRes.result || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadParentData();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            👨‍👩‍👧 Parent & Guardian Portal
          </Title>
          <Text type="secondary">
            Academic progress, attendance notifications, fee statements, and teacher communications for your linked child.
          </Text>
        </Col>
      </Row>

      {/* Linked Child Summary Card */}
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f766e 100%)',
          color: '#ffffff',
          marginBottom: 24,
          boxShadow: '0 10px 25px rgba(15, 118, 110, 0.15)',
        }}
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} sm={5} style={{ textAlign: 'center' }}>
            <Avatar
              size={90}
              style={{ backgroundColor: '#0d9488', fontSize: 32, border: '3px solid #5eead4' }}
            >
              {child?.name?.[0] || 'C'}
            </Avatar>
            <div style={{ marginTop: 8 }}>
              <Tag color="cyan">Roll #{child?.rollNumber || '101'}</Tag>
            </div>
          </Col>

          <Col xs={24} sm={19}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Title level={3} style={{ color: '#ffffff', margin: 0 }}>
                {child ? `${child.name} ${child.surname}` : 'Alex Morgan'}
              </Title>
              <Tag color="green">Active Enrolled</Tag>
            </div>
            <Text style={{ color: '#99f6e4', fontSize: 15 }}>
              Class: {child?.schoolClass?.name || 'Grade 10'} • Section {child?.section?.name || 'A'}
            </Text>

            <Divider style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '12px 0' }} />

            <Row gutter={[16, 8]}>
              <Col xs={24} sm={8}>
                <Text style={{ color: '#cbd5e1' }}>Admission ID: </Text>
                <Text strong style={{ color: '#ffffff' }}>{child?.admissionNumber || 'ADM-2026-001'}</Text>
              </Col>
              <Col xs={24} sm={8}>
                <Text style={{ color: '#cbd5e1' }}>Class Teacher: </Text>
                <Text strong style={{ color: '#ffffff' }}>Dr. Sarah Jenkins</Text>
              </Col>
              <Col xs={24} sm={8}>
                <Text style={{ color: '#cbd5e1' }}>School Contact: </Text>
                <Text strong style={{ color: '#ffffff'}}><PhoneOutlined /> +1 555-0192</Text>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="Attendance Rate"
              value={attendance?.attendanceRate ?? 96}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="Current Grade"
              value={reportCard?.overallGrade || 'A+'}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#0f766e' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="Pending Fees"
              value={feeData?.balance ?? 0}
              prefix="$"
              valueStyle={{ color: feeData?.balance > 0 ? '#dc2626' : '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="School Notices"
              value={notices.length}
              valueStyle={{ color: '#2563eb' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        defaultActiveKey="academics"
        items={[
          {
            key: 'academics',
            label: 'Child Academic Progress & Results',
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
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
                      title: 'Score',
                      dataIndex: 'marksObtained',
                      key: 'marksObtained',
                      render: (m, r) => `${m} / ${r.maxMarks}`,
                    },
                    {
                      title: 'Grade',
                      dataIndex: 'grade',
                      key: 'grade',
                      render: (g) => <Tag color="blue">{g}</Tag>,
                    },
                    {
                      title: 'Teacher Evaluation',
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
            label: 'Attendance Record',
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                  dataSource={attendance?.records || []}
                  rowKey="_id"
                  pagination={{ pageSize: 8 }}
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
                      title: 'Notes',
                      dataIndex: 'remarks',
                      key: 'remarks',
                      render: (r) => r || 'Recorded',
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'fees',
            label: 'Tuition Fees & Receipts',
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                  dataSource={feeData?.payments || []}
                  rowKey="_id"
                  pagination={false}
                  columns={[
                    {
                      title: 'Receipt Number',
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
            label: 'Parent Announcements',
            children: (
              <Row gutter={[16, 16]}>
                {notices.map((n) => (
                  <Col xs={24} md={12} key={n._id}>
                    <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <Tag color="cyan">{n.category}</Tag>
                      <Title level={5} style={{ margin: '8px 0' }}>{n.title}</Title>
                      <Paragraph style={{ color: '#475569', fontSize: 13 }}>{n.content}</Paragraph>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(n.publishDate).format('MMM D, YYYY')}
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

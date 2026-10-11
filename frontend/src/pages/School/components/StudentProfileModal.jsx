import React, { useState } from 'react';
import {
  Modal,
  Button,
  Descriptions,
  Tag,
  Avatar,
  Row,
  Col,
  Typography,
  Divider,
  Upload,
  message,
  Tabs,
} from 'antd';
import {
  PrinterOutlined,
  UploadOutlined,
  IdcardOutlined,
  PhoneOutlined,
  MailOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { schoolService } from '@/services/schoolService';
import { BASE_URL } from '@/config/serverApiConfig';

const { Title, Text } = Typography;

export default function StudentProfileModal({ student, open, onClose, onRefresh }) {
  const [uploading, setUploading] = useState(false);

  if (!student) return null;

  const photoUrl = student.photo
    ? student.photo.startsWith('http')
      ? student.photo
      : `${BASE_URL}${student.photo}`
    : null;

  const handleCustomUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true);
    try {
      const res = await schoolService.uploadStudentPhoto(student._id, file);
      if (res.success) {
        message.success('Student photograph updated successfully!');
        if (onRefresh) onRefresh();
        onSuccess(res.result);
      } else {
        message.error('Photo upload failed');
        onError(new Error('Upload failed'));
      }
    } catch (err) {
      message.error('Failed to upload student photograph');
      onError(err);
    } finally {
      setUploading(false);
    }
  };

  const printIdCard = () => {
    window.print();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={780}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={printIdCard}>
          Print Student ID Card
        </Button>,
      ]}
    >
      <Tabs
        defaultActiveKey="profile"
        items={[
          {
            key: 'profile',
            label: 'Student Profile Record',
            children: (
              <div>
                <Row gutter={[24, 24]} align="middle" style={{ marginBottom: 20 }}>
                  <Col xs={24} sm={6} style={{ textAlign: 'center' }}>
                    <Avatar
                      size={110}
                      src={photoUrl}
                      icon={<UserOutlined />}
                      style={{
                        backgroundColor: '#1890ff',
                        border: '3px solid #93c5fd',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                      }}
                    />
                    <div style={{ marginTop: 12 }}>
                      <Upload
                        customRequest={handleCustomUpload}
                        showUploadList={false}
                        accept="image/*"
                      >
                        <Button size="small" icon={<UploadOutlined />} loading={uploading}>
                          Update Photo
                        </Button>
                      </Upload>
                    </div>
                  </Col>

                  <Col xs={24} sm={18}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Title level={3} style={{ margin: 0, color: '#0f172a' }}>
                        {student.name} {student.surname}
                      </Title>
                      <Tag color="green">{student.status?.toUpperCase() || 'ACTIVE'}</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      Student ID: <Text strong>{student.studentId || student.admissionNumber}</Text> • Roll #{student.rollNumber}
                    </Text>

                    <div style={{ marginTop: 8 }}>
                      <Tag color="blue">{student.schoolClass?.name || 'Class'}</Tag>
                      <Tag color="cyan">Section {student.section?.name || 'A'}</Tag>
                      <Tag color="purple">AY {student.academicYear || '2026-2027'}</Tag>
                    </div>
                  </Col>
                </Row>

                <Divider style={{ margin: '14px 0' }} />

                <Descriptions title="Academic & Personal Details" bordered size="small" column={{ xs: 1, sm: 2 }}>
                  <Descriptions.Item label="Admission Number">{student.admissionNumber}</Descriptions.Item>
                  <Descriptions.Item label="Roll Number">#{student.rollNumber}</Descriptions.Item>
                  <Descriptions.Item label="Class & Section">
                    {student.schoolClass?.name || 'Grade 10'} - {student.section?.name || 'Section A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Academic Year">{student.academicYear || '2026-2027'}</Descriptions.Item>
                  <Descriptions.Item label="Date of Birth">
                    {student.dob ? dayjs(student.dob).format('MMM D, YYYY') : 'Not Recorded'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Gender">{student.gender || 'Not Specified'}</Descriptions.Item>
                  <Descriptions.Item label="Blood Group">
                    <Tag color="volcano">{student.bloodGroup || 'O+'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Nationality">{student.nationality || 'Citizen'}</Descriptions.Item>
                  <Descriptions.Item label="Student Phone">{student.phone || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Student Email">{student.email || 'N/A'}</Descriptions.Item>
                  <Descriptions.Item label="Home Address" span={2}>{student.address || 'Springfield, USA'}</Descriptions.Item>
                </Descriptions>

                <Divider style={{ margin: '14px 0' }} />

                <Descriptions title="Guardian & Emergency Contacts" bordered size="small" column={{ xs: 1, sm: 2 }}>
                  <Descriptions.Item label="Primary Guardian">{student.guardianName || 'David Morgan'}</Descriptions.Item>
                  <Descriptions.Item label="Relationship">{student.guardianRelation || 'Father'}</Descriptions.Item>
                  <Descriptions.Item label="Guardian Phone">{student.guardianPhone || '+1 555-7820'}</Descriptions.Item>
                  <Descriptions.Item label="Guardian Email">{student.guardianEmail || 'parent@school.edu'}</Descriptions.Item>
                  <Descriptions.Item label="Emergency Contact" span={2}>
                    <Text strong style={{ color: '#dc2626' }}>
                      {student.emergencyContact || `${student.guardianName || 'Guardian'} (${student.guardianPhone || '+1 555-7820'})`}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Medical & Allergy Notes" span={2}>
                    {student.medicalNotes || 'No known allergies reported.'}
                  </Descriptions.Item>
                </Descriptions>
              </div>
            ),
          },
          {
            key: 'idCard',
            label: 'Printable Student ID Card',
            children: (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                {/* ID Card Box */}
                <div
                  style={{
                    width: 360,
                    borderRadius: 16,
                    overflow: 'hidden',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {/* ID Header */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
                      color: '#ffffff',
                      padding: '16px 14px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 2 }}>🎓</div>
                    <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: 1 }}>
                      CAMPUS ACADEMY
                    </div>
                    <div style={{ fontSize: 10, color: '#93c5fd', letterSpacing: 1.5 }}>
                      STUDENT IDENTIFICATION CARD
                    </div>
                  </div>

                  {/* ID Body */}
                  <div style={{ padding: '20px 20px 14px', textAlign: 'center' }}>
                    <Avatar
                      size={90}
                      src={photoUrl}
                      icon={<UserOutlined />}
                      style={{
                        backgroundColor: '#2563eb',
                        border: '3px solid #3b82f6',
                        marginBottom: 10,
                      }}
                    />

                    <Title level={4} style={{ margin: '0 0 2px', color: '#0f172a' }}>
                      {student.name} {student.surname}
                    </Title>
                    <Tag color="blue" style={{ marginBottom: 12, fontWeight: 600 }}>
                      {student.schoolClass?.name || 'Grade 10'} • Section {student.section?.name || 'A'}
                    </Tag>

                    <div
                      style={{
                        background: '#f8fafc',
                        borderRadius: 8,
                        padding: '10px 14px',
                        textAlign: 'left',
                        fontSize: 12,
                        marginBottom: 14,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <Row gutter={[8, 6]}>
                        <Col span={12}>
                          <Text type="secondary">ID Number:</Text>
                          <div><Text strong>{student.studentId || student.admissionNumber}</Text></div>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Roll Number:</Text>
                          <div><Text strong>#{student.rollNumber}</Text></div>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Blood Group:</Text>
                          <div><Tag color="volcano" style={{ fontSize: 11 }}>{student.bloodGroup || 'O+'}</Tag></div>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Valid Term:</Text>
                          <div><Text strong>{student.academicYear || '2026-2027'}</Text></div>
                        </Col>
                        <Col span={24}>
                          <Text type="secondary">Emergency Contact:</Text>
                          <div><Text strong style={{ color: '#dc2626' }}>{student.guardianPhone || '+1 555-7820'}</Text></div>
                        </Col>
                      </Row>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 6, borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'left' }}>
                        <div>Issued: {dayjs().format('YYYY-MM-DD')}</div>
                        <div>Official Campus Credential</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 12, fontStyle: 'italic', color: '#1e3a8a', fontFamily: 'serif' }}>
                          A. Pendleton
                        </div>
                        <div style={{ fontSize: 9, color: '#64748b', borderTop: '1px solid #94a3b8', width: 90 }}>
                          Principal Signature
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}

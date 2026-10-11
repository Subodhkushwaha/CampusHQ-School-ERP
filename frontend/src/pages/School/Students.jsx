import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Row,
  Col,
  Typography,
  message,
  Popconfirm,
  Avatar,
  DatePicker,
  Upload,
} from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PhoneOutlined,
  MailOutlined,
  IdcardOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { schoolService } from '@/services/schoolService';
import StudentProfileModal from './components/StudentProfileModal';
import { BASE_URL } from '@/config/serverApiConfig';

const { Title, Text } = Typography;

export default function Students() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Admission / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Profile & ID Card Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedProfileStudent, setSelectedProfileStudent] = useState(null);

  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stuRes, classRes, secRes] = await Promise.all([
        schoolService.list('student'),
        schoolService.list('schoolclass'),
        schoolService.list('section'),
      ]);

      if (stuRes.success) setStudents(stuRes.result || []);
      if (classRes.success) setClasses(classRes.result || []);
      if (secRes.success) setSections(secRes.result || []);
    } catch (err) {
      message.error('Failed to load students data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        dob: values.dob ? values.dob.toISOString() : undefined,
      };

      if (editingStudent) {
        await schoolService.update('student', editingStudent._id, payload);
        message.success('Student details updated successfully');
      } else {
        await schoolService.create('student', payload);
        message.success('Student admitted & registered successfully');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingStudent(null);
      fetchData();
    } catch (err) {
      message.error('Failed to save student');
    }
  };

  const handleDelete = async (id) => {
    await schoolService.delete('student', id);
    message.success('Student record removed');
    fetchData();
  };

  const filteredStudents = students.filter((s) => {
    const matchClass = selectedClass ? (s.schoolClass?._id || s.schoolClass) === selectedClass : true;
    const query = searchQuery.trim().toLowerCase();
    const matchQuery = query === '' ||
      `${s.name} ${s.surname}`.toLowerCase().includes(query) ||
      s.rollNumber?.toLowerCase().includes(query) ||
      s.admissionNumber?.toLowerCase().includes(query) ||
      s.studentId?.toLowerCase().includes(query) ||
      s.phone?.toLowerCase().includes(query);
    return matchClass && matchQuery;
  });

  const columns = [
    {
      title: 'Student & Photo',
      key: 'name',
      render: (_, r) => {
        const photoUrl = r.photo
          ? r.photo.startsWith('http')
            ? r.photo
            : `${BASE_URL}${r.photo}`
          : null;

        return (
          <Space>
            <Avatar
              src={photoUrl}
              size={44}
              style={{ backgroundColor: '#2563eb' }}
            >
              {r.name?.[0] || 'S'}
            </Avatar>
            <div>
              <Text strong>{r.name} {r.surname}</Text>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                <Tag color="cyan" style={{ fontSize: 11, padding: '0 4px', marginRight: 4 }}>
                  Roll #{r.rollNumber || 'N/A'}
                </Tag>
                <Tag color="purple" style={{ fontSize: 11, padding: '0 4px' }}>
                  {r.studentId || r.admissionNumber}
                </Tag>
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Class & Section',
      key: 'classSection',
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Tag color="geekblue">{r.schoolClass?.name || 'Class'}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Section {r.section?.name || 'A'} • {r.academicYear || '2026-2027'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Guardian Contact',
      key: 'guardian',
      render: (_, r) => (
        <div>
          <Text strong>{r.guardianName || 'Guardian'}</Text>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            ({r.guardianRelation || 'Parent'})
          </div>
          {r.guardianPhone && (
            <div style={{ fontSize: 12, color: '#0369a1' }}>
              <PhoneOutlined /> {r.guardianPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Emergency Contact',
      dataIndex: 'emergencyContact',
      key: 'emergencyContact',
      render: (em, r) => (
        <div style={{ fontSize: 12, color: '#dc2626' }}>
          {em || r.guardianPhone || 'On File'}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st) => (
        <Tag color={st === 'active' ? 'green' : 'default'}>
          {st?.toUpperCase() || 'ACTIVE'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<IdcardOutlined />}
            onClick={() => {
              setSelectedProfileStudent(record);
              setProfileModalOpen(true);
            }}
          >
            Profile & ID
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingStudent(record);
              form.setFieldsValue({
                ...record,
                schoolClass: record.schoolClass?._id || record.schoolClass,
                section: record.section?._id || record.section,
                dob: record.dob ? dayjs(record.dob) : null,
              });
              setIsModalOpen(true);
            }}
          />
          <Popconfirm title="Delete student record?" onConfirm={() => handleDelete(record._id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            🎓 Student Admissions & Directory
          </Title>
          <Text type="secondary">
            Manage student registrations, academic enrollment, guardian contacts, photographs, and ID card credentials.
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => {
                setEditingStudent(null);
                form.resetFields();
                const nextNum = String(students.length + 1).padStart(3, '0');
                form.setFieldsValue({
                  admissionNumber: `ADM-2026-${nextNum}`,
                  studentId: `STU-2026-${nextNum}`,
                  academicYear: '2026-2027',
                });
                setIsModalOpen(true);
              }}
            >
              Admit New Student
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Filter and Search Bar */}
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={14} md={10}>
            <Input
              placeholder="Search by student name, roll #, ID, or phone..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={10} md={6}>
            <Select
              allowClear
              placeholder="Filter by Class"
              style={{ width: '100%' }}
              onChange={setSelectedClass}
              value={selectedClass}
            >
              {classes.map((c) => (
                <Select.Option key={c._id} value={c._id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Text type="secondary">
              Showing <Text strong>{filteredStudents.length}</Text> of {students.length} students
            </Text>
          </Col>
        </Row>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <Table
          dataSource={filteredStudents}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Student Profile & Printable ID Card Modal */}
      <StudentProfileModal
        open={profileModalOpen}
        student={selectedProfileStudent}
        onClose={() => setProfileModalOpen(false)}
        onRefresh={fetchData}
      />

      {/* Admission / Edit Modal */}
      <Modal
        title={editingStudent ? 'Edit Student Details' : 'Student Admission & Registration'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        width={780}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="First Name" rules={[{ required: true, message: 'First name is required' }]}>
                <Input placeholder="e.g. Alex" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="surname" label="Last Name" rules={[{ required: true, message: 'Last name is required' }]}>
                <Input placeholder="e.g. Morgan" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="admissionNumber"
                label="Admission Number"
                rules={[{ required: true, message: 'Unique admission number required' }]}
              >
                <Input placeholder="ADM-2026-001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="studentId" label="Student ID / Code">
                <Input placeholder="STU-2026-001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="rollNumber" label="Class Roll Number" rules={[{ required: true }]}>
                <Input placeholder="e.g. 101" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="schoolClass" label="Assigned Class" rules={[{ required: true }]}>
                <Select placeholder="Select Class">
                  {classes.map((c) => (
                    <Select.Option key={c._id} value={c._id}>
                      {c.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="section" label="Assigned Section">
                <Select placeholder="Select Section">
                  {sections.map((s) => (
                    <Select.Option key={s._id} value={s._id}>
                      {s.name} ({s.schoolClass?.name || 'Class'})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="academicYear" label="Academic Year" initialValue="2026-2027">
                <Input placeholder="2026-2027" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="guardianName" label="Guardian / Parent Name" rules={[{ required: true }]}>
                <Input placeholder="e.g. David Morgan" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="guardianRelation" label="Relation" initialValue="Father">
                <Select>
                  <Select.Option value="Father">Father</Select.Option>
                  <Select.Option value="Mother">Mother</Select.Option>
                  <Select.Option value="Guardian">Guardian</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="guardianPhone" label="Guardian Contact Phone" rules={[{ required: true }]}>
                <Input placeholder="+1 555-7820" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="guardianEmail" label="Guardian Email Address">
                <Input placeholder="parent@school.edu" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="emergencyContact" label="Emergency Contact (Name & Phone)">
                <Input placeholder="e.g. Dr. Jane Smith (+1 555-9999)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="medicalNotes" label="Medical / Allergy Notes">
                <Input placeholder="e.g. Penicillin allergy, inhaler" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Student Email Address">
                <Input placeholder="student@school.edu" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Student Mobile Phone">
                <Input placeholder="+1 555-7821" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="gender" label="Gender">
                <Select placeholder="Gender">
                  <Select.Option value="Male">Male</Select.Option>
                  <Select.Option value="Female">Female</Select.Option>
                  <Select.Option value="Other">Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="dob" label="Date of Birth">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="bloodGroup" label="Blood Group">
                <Input placeholder="e.g. O+, A+" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="nationality" label="Nationality" initialValue="Citizen">
                <Input placeholder="Citizen" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="Residential Street Address">
            <Input.TextArea rows={2} placeholder="Home street address, city, zip code" />
          </Form.Item>

          <Form.Item name="photo" label="Student Photo URL / File Path">
            <Input placeholder="https://... or upload photo after admission" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

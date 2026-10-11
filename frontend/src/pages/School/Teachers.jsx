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
  Statistic,
  Divider,
} from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PhoneOutlined,
  MailOutlined,
  ScheduleOutlined,
  ClockCircleOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { schoolService } from '@/services/schoolService';

const { Title, Text } = Typography;

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Edit / Add Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);

  // Workload Modal
  const [workloadModalOpen, setWorkloadModalOpen] = useState(false);
  const [selectedWorkload, setSelectedWorkload] = useState(null);
  const [workloadLoading, setWorkloadLoading] = useState(false);

  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teacherRes, classRes, subRes] = await Promise.all([
        schoolService.list('teacher'),
        schoolService.list('schoolclass'),
        schoolService.list('subject'),
      ]);

      if (teacherRes.success) setTeachers(teacherRes.result || []);
      if (classRes.success) setClasses(classRes.result || []);
      if (subRes.success) setSubjects(subRes.result || []);
    } catch (err) {
      message.error('Failed to load teachers data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (values) => {
    try {
      if (editingTeacher) {
        await schoolService.update('teacher', editingTeacher._id, values);
        message.success('Teacher updated successfully');
      } else {
        await schoolService.create('teacher', values);
        message.success('Teacher registered and assigned successfully');
      }
      setIsModalOpen(false);
      form.resetFields();
      setEditingTeacher(null);
      fetchData();
    } catch (err) {
      message.error('Failed to save teacher');
    }
  };

  const handleDelete = async (id) => {
    await schoolService.delete('teacher', id);
    message.success('Teacher removed');
    fetchData();
  };

  const viewWorkload = async (teacher) => {
    setWorkloadLoading(true);
    setWorkloadModalOpen(true);
    try {
      const res = await schoolService.getTeacherWorkload(teacher._id);
      if (res.success) {
        setSelectedWorkload(res.result);
      }
    } catch (err) {
      message.error('Failed to load teacher workload');
    } finally {
      setWorkloadLoading(false);
    }
  };

  const columns = [
    {
      title: 'Teacher Name',
      key: 'name',
      render: (_, r) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1890ff' }}>{r.name?.[0] || 'T'}</Avatar>
          <div>
            <Text strong>{r.name} {r.surname}</Text>
            <div style={{ fontSize: 12, color: '#64748b' }}>{r.specialization || 'Faculty'}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, r) => (
        <div>
          <div><MailOutlined /> {r.email}</div>
          {r.phone && <div style={{ fontSize: 12, color: '#64748b' }}><PhoneOutlined /> {r.phone}</div>}
        </div>
      ),
    },
    {
      title: 'Qualification',
      dataIndex: 'qualification',
      key: 'qualification',
      render: (q) => q || 'B.Ed / M.Sc',
    },
    {
      title: 'Assigned Classes',
      dataIndex: 'assignedClasses',
      key: 'assignedClasses',
      render: (assigned) => (
        <Space wrap>
          {Array.isArray(assigned) && assigned.length > 0 ? (
            assigned.map((c, i) => (
              <Tag key={i} color="geekblue">
                {c?.name || 'Class'}
              </Tag>
            ))
          ) : (
            <Text type="secondary">None</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Assigned Subjects',
      dataIndex: 'assignedSubjects',
      key: 'assignedSubjects',
      render: (subs) => (
        <Space wrap>
          {Array.isArray(subs) && subs.length > 0 ? (
            subs.map((s, i) => (
              <Tag key={i} color="cyan">
                {s?.name || s?.code || 'Subject'}
              </Tag>
            ))
          ) : (
            <Text type="secondary">General</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st) => <Tag color={st === 'active' ? 'green' : 'orange'}>{st?.toUpperCase() || 'ACTIVE'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<ScheduleOutlined />}
            onClick={() => viewWorkload(record)}
          >
            Workload
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingTeacher(record);
              form.setFieldsValue({
                ...record,
                assignedClasses: record.assignedClasses?.map((c) => c._id || c),
                assignedSubjects: record.assignedSubjects?.map((s) => s._id || s),
              });
              setIsModalOpen(true);
            }}
          />
          <Popconfirm title="Remove this teacher?" onConfirm={() => handleDelete(record._id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            👨‍🏫 Faculty & Teacher Management
          </Title>
          <Text type="secondary">
            Register academic staff, assign subjects, classes, monitor workloads, and manage timetables.
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
                setEditingTeacher(null);
                form.resetFields();
                setIsModalOpen(true);
              }}
            >
              Add New Teacher
            </Button>
          </Space>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <Table dataSource={teachers} columns={columns} rowKey="_id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>

      {/* Edit / Add Modal */}
      <Modal
        title={editingTeacher ? 'Edit Teacher Details' : 'Register New Faculty / Teacher'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="First Name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Sarah" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="surname" label="Last Name" rules={[{ required: true }]}>
                <Input placeholder="e.g. Jenkins" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="School Email Address" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="teacher@school.edu" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone Number">
                <Input placeholder="+1 555-0192" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="qualification" label="Academic Qualification">
                <Input placeholder="e.g. Ph.D. Mathematics, M.Sc." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="specialization" label="Subject Specialization">
                <Input placeholder="e.g. Advanced Calculus, Physics" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="assignedClasses" label="Assigned Classes">
            <Select mode="multiple" placeholder="Select classes this teacher instructs">
              {classes.map((c) => (
                <Select.Option key={c._id} value={c._id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="assignedSubjects" label="Assigned Subjects">
            <Select mode="multiple" placeholder="Select subjects this teacher instructs">
              {subjects.map((s) => (
                <Select.Option key={s._id} value={s._id}>
                  {s.name} ({s.code}) - {s.schoolClass?.name || 'Class'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="gender" label="Gender">
                <Select placeholder="Select gender">
                  <Select.Option value="Male">Male</Select.Option>
                  <Select.Option value="Female">Female</Select.Option>
                  <Select.Option value="Other">Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" initialValue="active">
                <Select>
                  <Select.Option value="active">Active</Select.Option>
                  <Select.Option value="inactive">Inactive</Select.Option>
                  <Select.Option value="on_leave">On Leave</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Teacher Workload & Schedule Modal */}
      <Modal
        title="Teacher Workload & Teaching Timetable"
        open={workloadModalOpen}
        onCancel={() => setWorkloadModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setWorkloadModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {selectedWorkload ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Title level={4} style={{ margin: 0, color: '#1e3a8a' }}>
                {selectedWorkload.teacher?.name} {selectedWorkload.teacher?.surname}
              </Title>
              <Text type="secondary">{selectedWorkload.teacher?.qualification} • {selectedWorkload.teacher?.specialization}</Text>
            </div>

            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col span={8}>
                <Card bordered size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                  <Statistic
                    title="Weekly Periods"
                    value={selectedWorkload.periodsPerWeek}
                    prefix={<ScheduleOutlined />}
                    valueStyle={{ color: '#2563eb' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card bordered size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                  <Statistic
                    title="Est. Teaching Hours"
                    value={selectedWorkload.estimatedTeachingHours}
                    suffix="hrs/wk"
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: '#16a34a' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card bordered size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                  <Statistic
                    title="Classes Instructed"
                    value={selectedWorkload.assignedClassesCount}
                    prefix={<BookOutlined />}
                    valueStyle={{ color: '#7c3aed' }}
                  />
                </Card>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0' }} />

            <Title level={5}>Scheduled Timetable Periods</Title>
            <Table
              dataSource={selectedWorkload.timetableSlots || []}
              rowKey="_id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Day',
                  dataIndex: 'dayOfWeek',
                  key: 'dayOfWeek',
                  render: (d) => <Tag color="blue">{d}</Tag>,
                },
                {
                  title: 'Period',
                  dataIndex: 'periodNumber',
                  key: 'periodNumber',
                  render: (p) => `Period ${p}`,
                },
                {
                  title: 'Class / Section',
                  key: 'classSection',
                  render: (_, r) => `${r.schoolClass?.name || 'Class'} (${r.section?.name || 'A'})`,
                },
                {
                  title: 'Subject',
                  dataIndex: 'subject',
                  key: 'subject',
                  render: (s) => s?.name || 'Subject',
                },
                {
                  title: 'Time & Room',
                  key: 'time',
                  render: (_, r) => `${r.startTime} - ${r.endTime} | ${r.roomNumber || 'Room 301'}`,
                },
              ]}
            />
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center' }}>Loading teacher workload...</div>
        )}
      </Modal>
    </div>
  );
}

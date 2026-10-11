import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Space,
  Row,
  Col,
  Typography,
  message,
  Popconfirm,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  BookOutlined,
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { schoolService } from '@/services/schoolService';

const { Title, Text } = Typography;

export default function ClassesSections() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [editingSection, setEditingSection] = useState(null);

  const [classForm] = Form.useForm();
  const [sectionForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classRes, secRes, teacherRes] = await Promise.all([
        schoolService.list('schoolclass'),
        schoolService.list('section'),
        schoolService.list('teacher'),
      ]);

      if (classRes.success) setClasses(classRes.result || []);
      if (secRes.success) setSections(secRes.result || []);
      if (teacherRes.success) setTeachers(teacherRes.result || []);
    } catch (err) {
      message.error('Failed to load classes and sections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Class submit
  const handleClassSubmit = async (values) => {
    try {
      if (editingClass) {
        await schoolService.update('schoolclass', editingClass._id, values);
        message.success('Class updated successfully');
      } else {
        await schoolService.create('schoolclass', values);
        message.success('Class created successfully');
      }
      setIsClassModalOpen(false);
      classForm.resetFields();
      setEditingClass(null);
      fetchData();
    } catch (err) {
      message.error('Error saving class');
    }
  };

  // Section submit
  const handleSectionSubmit = async (values) => {
    try {
      if (editingSection) {
        await schoolService.update('section', editingSection._id, values);
        message.success('Section updated successfully');
      } else {
        await schoolService.create('section', values);
        message.success('Section created successfully');
      }
      setIsSectionModalOpen(false);
      sectionForm.resetFields();
      setEditingSection(null);
      fetchData();
    } catch (err) {
      message.error('Error saving section');
    }
  };

  const handleDeleteClass = async (id) => {
    await schoolService.delete('schoolclass', id);
    message.success('Class deleted');
    fetchData();
  };

  const handleDeleteSection = async (id) => {
    await schoolService.delete('section', id);
    message.success('Section deleted');
    fetchData();
  };

  const classColumns = [
    {
      title: 'Class Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Grade Level',
      dataIndex: 'grade',
      key: 'grade',
      render: (grade) => <Tag color="blue">Grade {grade || '-'}</Tag>,
    },
    {
      title: 'Class Teacher',
      dataIndex: 'classTeacher',
      key: 'classTeacher',
      render: (teacher) => (teacher ? `${teacher.name} ${teacher.surname}` : <Text type="secondary">Unassigned</Text>),
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
      render: (cap) => `${cap || 40} Students`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st) => <Tag color={st === 'active' ? 'green' : 'default'}>{st?.toUpperCase() || 'ACTIVE'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingClass(record);
              classForm.setFieldsValue({
                ...record,
                classTeacher: record.classTeacher?._id || record.classTeacher,
              });
              setIsClassModalOpen(true);
            }}
          />
          <Popconfirm title="Delete this class?" onConfirm={() => handleDeleteClass(record._id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const sectionColumns = [
    {
      title: 'Section Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Class',
      dataIndex: 'schoolClass',
      key: 'schoolClass',
      render: (c) => <Tag color="geekblue">{c?.name || 'Assigned'}</Tag>,
    },
    {
      title: 'Room Number',
      dataIndex: 'roomNumber',
      key: 'roomNumber',
      render: (room) => room || 'TBA',
    },
    {
      title: 'Max Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
      render: (cap) => `${cap || 35} Students`,
    },
    {
      title: 'Section Teacher',
      dataIndex: 'classTeacher',
      key: 'classTeacher',
      render: (teacher) => (teacher ? `${teacher.name} ${teacher.surname}` : <Text type="secondary">Unassigned</Text>),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingSection(record);
              sectionForm.setFieldsValue({
                ...record,
                schoolClass: record.schoolClass?._id || record.schoolClass,
                classTeacher: record.classTeacher?._id || record.classTeacher,
              });
              setIsSectionModalOpen(true);
            }}
          />
          <Popconfirm title="Delete this section?" onConfirm={() => handleDeleteSection(record._id)}>
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
            🏛️ Class & Section Management
          </Title>
          <Text type="secondary">Organize grade levels, sections, classroom assignments, and class teachers.</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingClass(null);
                classForm.resetFields();
                setIsClassModalOpen(true);
              }}
            >
              Add Class
            </Button>
            <Button
              type="default"
              icon={<AppstoreOutlined />}
              onClick={() => {
                setEditingSection(null);
                sectionForm.resetFields();
                setIsSectionModalOpen(true);
              }}
            >
              Add Section
            </Button>
          </Space>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="classes"
        items={[
          {
            key: 'classes',
            label: `Classes (${classes.length})`,
            children: (
              <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <Table
                  dataSource={classes}
                  columns={classColumns}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'sections',
            label: `Sections (${sections.length})`,
            children: (
              <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <Table
                  dataSource={sections}
                  columns={sectionColumns}
                  rowKey="_id"
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Class Modal */}
      <Modal
        title={editingClass ? 'Edit Class' : 'Create New Class'}
        open={isClassModalOpen}
        onCancel={() => setIsClassModalOpen(false)}
        onOk={() => classForm.submit()}
      >
        <Form form={classForm} layout="vertical" onFinish={handleClassSubmit}>
          <Form.Item name="name" label="Class Name" rules={[{ required: true, message: 'Class name is required' }]}>
            <Input placeholder="e.g. Grade 10 or Class 5" />
          </Form.Item>
          <Form.Item name="grade" label="Grade Level (Numeric)">
            <InputNumber min={1} max={12} style={{ width: '100%' }} placeholder="e.g. 10" />
          </Form.Item>
          <Form.Item name="capacity" label="Student Capacity" initialValue={40}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="classTeacher" label="Assigned Class Teacher">
            <Select placeholder="Select teacher" allowClear>
              {teachers.map((t) => (
                <Select.Option key={t._id} value={t._id}>
                  {t.name} {t.surname} ({t.specialization || 'Teacher'})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional notes" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Section Modal */}
      <Modal
        title={editingSection ? 'Edit Section' : 'Create New Section'}
        open={isSectionModalOpen}
        onCancel={() => setIsSectionModalOpen(false)}
        onOk={() => sectionForm.submit()}
      >
        <Form form={sectionForm} layout="vertical" onFinish={handleSectionSubmit}>
          <Form.Item name="name" label="Section Name" rules={[{ required: true, message: 'Section name is required' }]}>
            <Input placeholder="e.g. Section A" />
          </Form.Item>
          <Form.Item
            name="schoolClass"
            label="Belongs to Class"
            rules={[{ required: true, message: 'Please select a class' }]}
          >
            <Select placeholder="Select class">
              {classes.map((c) => (
                <Select.Option key={c._id} value={c._id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="roomNumber" label="Classroom / Hall Number">
            <Input placeholder="e.g. Room 301" />
          </Form.Item>
          <Form.Item name="capacity" label="Section Capacity" initialValue={35}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="classTeacher" label="Section Supervisor / Teacher">
            <Select placeholder="Select teacher" allowClear>
              {teachers.map((t) => (
                <Select.Option key={t._id} value={t._id}>
                  {t.name} {t.surname}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Tag,
  Typography,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Table,
  message,
} from 'antd';
import {
  ScheduleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { schoolService } from '@/services/schoolService';

const { Title, Text } = Typography;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetableHub() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [timetables, setTimetables] = useState([]);

  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchBasics = async () => {
    try {
      const [classRes, secRes, subRes, teachRes] = await Promise.all([
        schoolService.list('schoolclass'),
        schoolService.list('section'),
        schoolService.list('subject'),
        schoolService.list('teacher'),
      ]);

      if (classRes.success && classRes.result?.length > 0) {
        setClasses(classRes.result);
        setSelectedClass(classRes.result[0]._id);
      }
      if (secRes.success && secRes.result?.length > 0) {
        setSections(secRes.result);
        setSelectedSection(secRes.result[0]._id);
      }
      if (subRes.success) setSubjects(subRes.result || []);
      if (teachRes.success) setTeachers(teachRes.result || []);
    } catch (err) {
      message.error('Failed to load timetable options');
    }
  };

  useEffect(() => {
    fetchBasics();
  }, []);

  const fetchTimetables = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const res = await schoolService.list('timetable', {
        schoolClass: selectedClass,
      });
      if (res.success) setTimetables(res.result || []);
    } catch (err) {
      message.error('Failed to load timetables');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetables();
  }, [selectedClass, selectedSection]);

  const handleCreate = async (values) => {
    try {
      await schoolService.create('timetable', {
        ...values,
        schoolClass: selectedClass,
        section: selectedSection,
      });
      message.success('Timetable period scheduled successfully');
      setIsModalOpen(false);
      form.resetFields();
      fetchTimetables();
    } catch (err) {
      message.error('Failed to save timetable slot');
    }
  };

  // Build grid: periods 1..5 for each day
  const periods = [1, 2, 3, 4, 5];

  const gridData = periods.map((periodNum) => {
    const row = { periodNumber: periodNum };
    DAYS.forEach((day) => {
      const slot = timetables.find(
        (t) => t.dayOfWeek === day && t.periodNumber === periodNum
      );
      row[day] = slot;
    });
    return row;
  });

  const columns = [
    {
      title: 'Period #',
      dataIndex: 'periodNumber',
      key: 'periodNumber',
      width: 100,
      render: (p) => <Tag color="blue" style={{ fontWeight: 'bold' }}>Period {p}</Tag>,
    },
    ...DAYS.map((day) => ({
      title: day,
      dataIndex: day,
      key: day,
      render: (slot) => {
        if (!slot) return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
        return (
          <div
            style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: 8,
              padding: '6px 10px',
            }}
          >
            <Text strong style={{ color: '#0369a1', display: 'block' }}>
              {slot.subject?.name || 'Subject'}
            </Text>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              👨‍🏫 {slot.teacher ? `${slot.teacher.name} ${slot.teacher.surname}` : 'Teacher'}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              ⏰ {slot.startTime} - {slot.endTime} | {slot.roomNumber || 'Room 301'}
            </div>
          </div>
        );
      },
    })),
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            🗓️ Academic Timetable & Schedules
          </Title>
          <Text type="secondary">Class weekly timetable, subject allocations, teacher assignments, and classroom rooms.</Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTimetables}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
              Add Class Period
            </Button>
          </Space>
        </Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <Space wrap size="large">
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Select Class:</Text>
            <Select style={{ width: 160 }} value={selectedClass} onChange={setSelectedClass}>
              {classes.map((c) => (
                <Select.Option key={c._id} value={c._id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Select Section:</Text>
            <Select style={{ width: 140 }} value={selectedSection} onChange={setSelectedSection}>
              {sections.map((s) => (
                <Select.Option key={s._id} value={s._id}>
                  {s.name}
                </Select.Option>
              ))}
            </Select>
          </div>
        </Space>
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          dataSource={gridData}
          columns={columns}
          rowKey="periodNumber"
          loading={loading}
          pagination={false}
          bordered
        />
      </Card>

      <Modal
        title="Schedule Period in Timetable"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dayOfWeek" label="Day of Week" initialValue="Monday" rules={[{ required: true }]}>
                <Select>
                  {DAYS.map((d) => (
                    <Select.Option key={d} value={d}>
                      {d}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="periodNumber" label="Period Number (1 - 5)" initialValue={1} rules={[{ required: true }]}>
                <InputNumber min={1} max={8} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
                <Select placeholder="Select Subject">
                  {subjects.map((s) => (
                    <Select.Option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="teacher" label="Teacher" rules={[{ required: true }]}>
                <Select placeholder="Select Teacher">
                  {teachers.map((t) => (
                    <Select.Option key={t._id} value={t._id}>
                      {t.name} {t.surname}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startTime" label="Start Time" initialValue="08:30 AM" rules={[{ required: true }]}>
                <Input placeholder="08:30 AM" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="End Time" initialValue="09:20 AM" rules={[{ required: true }]}>
                <Input placeholder="09:20 AM" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="roomNumber" label="Classroom / Lab" initialValue="Room 301">
            <Input placeholder="Room 301 or Lab 2" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

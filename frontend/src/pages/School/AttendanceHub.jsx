import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Button,
  Table,
  Radio,
  Input,
  Tag,
  Typography,
  Space,
  message,
  Statistic,
  Tabs,
  Badge,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  CheckOutlined,
  ReloadOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { schoolService } from '@/services/schoolService';

const { Title, Text } = Typography;

export default function AttendanceHub() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(dayjs());
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // { studentId: { status, remarks } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // History tab state
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [classRes, secRes] = await Promise.all([
        schoolService.list('schoolclass'),
        schoolService.list('section'),
      ]);
      let defaultClassId = null;
      let loadedSections = [];
      if (classRes.success && classRes.result?.length > 0) {
        setClasses(classRes.result);
        defaultClassId = classRes.result[0]._id;
        setSelectedClass(defaultClassId);
      }
      if (secRes.success && secRes.result?.length > 0) {
        loadedSections = secRes.result;
        setSections(loadedSections);
        if (defaultClassId) {
          const matchingSecs = loadedSections.filter(
            (s) => (s.schoolClass?._id || s.schoolClass) === defaultClassId
          );
          setSelectedSection(matchingSecs[0]?._id || null);
        }
      }
    };
    init();
  }, []);

  // When class or section or date changes, load students & existing attendance
  useEffect(() => {
    if (!selectedClass || !selectedSection) {
      setStudents([]);
      setAttendanceMap({});
      return;
    }

    const loadStudentsAndAttendance = async () => {
      setLoading(true);
      try {
        const stuRes = await schoolService.list('student', {
          schoolClass: selectedClass,
          section: selectedSection,
          items: 200,
        });
        const allStudents = stuRes.result || [];
        setStudents(allStudents);

        // Fetch existing attendance for this class/section/date
        const attRes = await schoolService.getClassAttendanceReport({
          schoolClass: selectedClass,
          section: selectedSection,
          startDate: attendanceDate.startOf('day').toISOString(),
          endDate: attendanceDate.endOf('day').toISOString(),
        });

        const newMap = {};
        allStudents.forEach((stu) => {
          newMap[stu._id] = { status: 'Present', remarks: '' };
        });

        if (attRes.success && Array.isArray(attRes.result)) {
          attRes.result.forEach((rec) => {
            const sId = rec.student?._id || rec.student;
            if (sId) {
              newMap[sId] = {
                status: rec.status || 'Present',
                remarks: rec.remarks || '',
              };
            }
          });
        }
        setAttendanceMap(newMap);
      } catch (err) {
        message.error('Failed to load class attendance');
      } finally {
        setLoading(false);
      }
    };

    loadStudentsAndAttendance();
  }, [selectedClass, selectedSection, attendanceDate]);

  const loadHistory = async () => {
    if (!selectedClass) return;
    setHistoryLoading(true);
    try {
      const res = await schoolService.getClassAttendanceReport({
        schoolClass: selectedClass,
        section: selectedSection,
      });
      if (res.success) setHistoryRecords(res.result || []);
    } catch (err) {
      message.error('Failed to load attendance history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarksChange = (studentId, remarks) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const markAll = (status) => {
    const updated = { ...attendanceMap };
    students.forEach((s) => {
      updated[s._id] = {
        ...updated[s._id],
        status,
      };
    });
    setAttendanceMap(updated);
    message.info(`Marked all students as ${status}`);
  };

  const saveAttendance = async () => {
    if (!selectedClass || !selectedSection) {
      message.error('Please select both a class and a section before saving attendance.');
      return;
    }
    if (students.length === 0) {
      message.warning('No students in this class and section to mark attendance.');
      return;
    }

    setSaving(true);
    try {
      const records = students.map((s) => ({
        student: s._id,
        status: attendanceMap[s._id]?.status || 'Present',
        remarks: attendanceMap[s._id]?.remarks || '',
      }));

      const res = await schoolService.bulkMarkAttendance({
        schoolClass: selectedClass,
        section: selectedSection,
        date: attendanceDate.format('YYYY-MM-DD'),
        records,
      });

      if (res.success) {
        message.success(`Saved attendance for ${records.length} students successfully!`);
      }
    } catch (err) {
      message.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // Stats calculation
  const totalCount = students.length;
  const presentCount = Object.values(attendanceMap).filter((v) => v.status === 'Present').length;
  const absentCount = Object.values(attendanceMap).filter((v) => v.status === 'Absent').length;
  const lateCount = Object.values(attendanceMap).filter((v) => v.status === 'Late').length;
  const percentPresent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

  const markingColumns = [
    {
      title: 'Roll #',
      dataIndex: 'rollNumber',
      key: 'rollNumber',
      width: 90,
      render: (r) => <Tag color="cyan">#{r || '-'}</Tag>,
    },
    {
      title: 'Student Name',
      key: 'name',
      render: (_, r) => (
        <div>
          <Text strong>{r.name} {r.surname}</Text>
          <div style={{ fontSize: 12, color: '#64748b' }}>{r.admissionNumber}</div>
        </div>
      ),
    },
    {
      title: 'Attendance Status',
      key: 'status',
      width: 320,
      render: (_, r) => {
        const current = attendanceMap[r._id]?.status || 'Present';
        return (
          <Radio.Group
            value={current}
            onChange={(e) => handleStatusChange(r._id, e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="Present" style={{ color: current === 'Present' ? '#fff' : '#52c41a' }}>
              Present
            </Radio.Button>
            <Radio.Button value="Absent" style={{ color: current === 'Absent' ? '#fff' : '#f5222d' }}>
              Absent
            </Radio.Button>
            <Radio.Button value="Late" style={{ color: current === 'Late' ? '#fff' : '#fa8c16' }}>
              Late
            </Radio.Button>
            <Radio.Button value="Excused" style={{ color: current === 'Excused' ? '#fff' : '#1890ff' }}>
              Excused
            </Radio.Button>
          </Radio.Group>
        );
      },
    },
    {
      title: 'Remarks / Notes',
      key: 'remarks',
      render: (_, r) => (
        <Input
          placeholder="e.g. Doctor note, delayed bus"
          value={attendanceMap[r._id]?.remarks || ''}
          onChange={(e) => handleRemarksChange(r._id, e.target.value)}
          style={{ maxWidth: 260 }}
        />
      ),
    },
  ];

  const historyColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (d) => dayjs(d).format('YYYY-MM-DD (ddd)'),
    },
    {
      title: 'Student',
      dataIndex: 'student',
      key: 'student',
      render: (s) => (s ? `${s.name} ${s.surname} (Roll #${s.rollNumber})` : 'Student'),
    },
    {
      title: 'Class / Section',
      key: 'class',
      render: (_, r) => `${r.schoolClass?.name || 'Class'} - ${r.section?.name || 'Section'}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (st) => {
        let color = 'green';
        if (st === 'Absent') color = 'red';
        if (st === 'Late') color = 'orange';
        if (st === 'Excused') color = 'blue';
        return <Tag color={color}>{st}</Tag>;
      },
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      render: (rem) => rem || '-',
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            📋 Daily Attendance Management
          </Title>
          <Text type="secondary">
            Take roll call, mark present/absent statuses, record arrival delays, and track class attendance rates.
          </Text>
        </Col>
      </Row>

      {/* Filter and selection bar */}
      <Card bordered={false} style={{ borderRadius: 12, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={16}>
            <Space wrap size="middle">
              <div>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Select Class:</Text>
                <Select
                  style={{ width: 160 }}
                  value={selectedClass}
                  onChange={(val) => {
                    setSelectedClass(val);
                    const matchingSecs = sections.filter(
                      (s) => (s.schoolClass?._id || s.schoolClass) === val
                    );
                    setSelectedSection(matchingSecs[0]?._id || null);
                  }}
                >
                  {classes.map((c) => (
                    <Select.Option key={c._id} value={c._id}>
                      {c.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>

              <div>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Select Section:</Text>
                <Select
                  style={{ width: 140 }}
                  value={selectedSection}
                  onChange={setSelectedSection}
                  placeholder="Select Section"
                >
                  {sections
                    .filter((s) => (s.schoolClass?._id || s.schoolClass) === selectedClass)
                    .map((s) => (
                      <Select.Option key={s._id} value={s._id}>
                        {s.name}
                      </Select.Option>
                    ))}
                </Select>
              </div>

              <div>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Attendance Date:</Text>
                <DatePicker
                  value={attendanceDate}
                  onChange={(d) => setAttendanceDate(d || dayjs())}
                  format="YYYY-MM-DD"
                  allowClear={false}
                />
              </div>
            </Space>
          </Col>

          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => markAll('Present')} icon={<CheckOutlined />}>
                All Present
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={saveAttendance}
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
              >
                Save Attendance
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Metrics Row */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 10, textAlign: 'center' }}>
            <Statistic title="Total Students" value={totalCount} prefix="👥" />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 10, textAlign: 'center' }}>
            <Statistic
              title="Present Today"
              value={presentCount}
              valueStyle={{ color: '#16a34a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 10, textAlign: 'center' }}>
            <Statistic
              title="Absent Today"
              value={absentCount}
              valueStyle={{ color: '#dc2626' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} style={{ borderRadius: 10, textAlign: 'center' }}>
            <Statistic
              title="Attendance Rate"
              value={percentPresent}
              suffix="%"
              valueStyle={{ color: percentPresent >= 75 ? '#16a34a' : '#d97706' }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="marking"
        onChange={(key) => {
          if (key === 'history') loadHistory();
        }}
        items={[
          {
            key: 'marking',
            label: 'Roll Call Grid',
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                  dataSource={students}
                  columns={markingColumns}
                  rowKey="_id"
                  loading={loading}
                  pagination={false}
                />
              </Card>
            ),
          },
          {
            key: 'history',
            label: 'Attendance History & Log',
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                  dataSource={historyRecords}
                  columns={historyColumns}
                  rowKey="_id"
                  loading={historyLoading}
                  pagination={{ pageSize: 15 }}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}

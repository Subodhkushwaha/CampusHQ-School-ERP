import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  InputNumber,
  Input,
  Button,
  Table,
  Tag,
  Typography,
  Space,
  message,
  Tabs,
  Modal,
  Form,
  DatePicker,
  Divider,
} from 'antd';
import {
  FileDoneOutlined,
  SaveOutlined,
  PlusOutlined,
  TrophyOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { schoolService } from '@/services/schoolService';

const { Title, Text } = Typography;

export default function ExaminationsHub() {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  // Selections
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Marks map: { studentId: { marksObtained, maxMarks, remarks } }
  const [marksMap, setMarksMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Exam Modal
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examForm] = Form.useForm();

  // Report card state
  const [reportStudentId, setReportStudentId] = useState(null);
  const [reportCardData, setReportCardData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchBasics = async () => {
    try {
      const [examRes, classRes, secRes, subRes, stuRes] = await Promise.all([
        schoolService.list('exam'),
        schoolService.list('schoolclass'),
        schoolService.list('section'),
        schoolService.list('subject'),
        schoolService.list('student'),
      ]);

      if (examRes.success && examRes.result?.length > 0) {
        setExams(examRes.result);
        setSelectedExam(examRes.result[0]._id);
      }
      if (classRes.success && classRes.result?.length > 0) {
        setClasses(classRes.result);
        setSelectedClass(classRes.result[0]._id);
      }
      if (secRes.success && secRes.result?.length > 0) {
        setSections(secRes.result);
        setSelectedSection(secRes.result[0]._id);
      }
      if (subRes.success && subRes.result?.length > 0) {
        setSubjects(subRes.result);
        setSelectedSubject(subRes.result[0]._id);
      }
      if (stuRes.success && stuRes.result?.length > 0) {
        setStudents(stuRes.result);
        setReportStudentId(stuRes.result[0]._id);
      }
    } catch (err) {
      message.error('Failed to load examination initial data');
    }
  };

  useEffect(() => {
    fetchBasics();
  }, []);

  // When selections change, load marks for that exam & subject
  useEffect(() => {
    if (!selectedClass || !selectedExam || !selectedSubject) return;

    const loadStudentsAndMarks = async () => {
      setLoading(true);
      try {
        const stuRes = await schoolService.list('student', { schoolClass: selectedClass });
        const classStudents = stuRes.result || [];
        setStudents(classStudents);

        const resultsRes = await schoolService.list('examresult', {
          exam: selectedExam,
          schoolClass: selectedClass,
          subject: selectedSubject,
        });

        const newMap = {};
        classStudents.forEach((stu) => {
          newMap[stu._id] = { marksObtained: 85, maxMarks: 100, remarks: '' };
        });

        if (resultsRes.success && Array.isArray(resultsRes.result)) {
          resultsRes.result.forEach((r) => {
            const sId = r.student?._id || r.student;
            if (sId) {
              newMap[sId] = {
                marksObtained: r.marksObtained,
                maxMarks: r.maxMarks,
                remarks: r.remarks || '',
              };
            }
          });
        }

        setMarksMap(newMap);
      } catch (err) {
        message.error('Failed to load marks');
      } finally {
        setLoading(false);
      }
    };

    loadStudentsAndMarks();
  }, [selectedExam, selectedClass, selectedSubject]);

  const handleMarksChange = (studentId, val) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marksObtained: val,
      },
    }));
  };

  const handleRemarksChange = (studentId, val) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks: val,
      },
    }));
  };

  const computeGrade = (obtained, max = 100, isAbsent = false) => {
    if (isAbsent) return { grade: 'AB', color: 'red' };
    const pct = (obtained / max) * 100;
    if (pct >= 90) return { grade: 'A+', color: 'green' };
    if (pct >= 80) return { grade: 'A', color: 'cyan' };
    if (pct >= 70) return { grade: 'B', color: 'blue' };
    if (pct >= 60) return { grade: 'C', color: 'orange' };
    if (pct >= 50) return { grade: 'D', color: 'gold' };
    return { grade: 'F', color: 'red' };
  };

  const handleAbsentToggle = (studentId, isAbsent) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        isAbsent,
        marksObtained: isAbsent ? 0 : (prev[studentId]?.marksObtained || 85),
      },
    }));
  };

  const saveMarks = async () => {
    // Validate maximum marks bounds
    for (const s of students) {
      const rec = marksMap[s._id];
      if (rec && !rec.isAbsent) {
        const marks = Number(rec.marksObtained);
        const max = Number(rec.maxMarks) || 100;
        if (marks > max) {
          message.error(`Marks for ${s.name} ${s.surname} (${marks}) exceeds maximum marks (${max}).`);
          return;
        }
        if (marks < 0) {
          message.error(`Marks for ${s.name} ${s.surname} cannot be negative.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const records = students.map((s) => ({
        student: s._id,
        marksObtained: marksMap[s._id]?.isAbsent ? 0 : (marksMap[s._id]?.marksObtained || 0),
        maxMarks: marksMap[s._id]?.maxMarks || 100,
        isAbsent: Boolean(marksMap[s._id]?.isAbsent),
        remarks: marksMap[s._id]?.remarks || '',
      }));

      const res = await schoolService.bulkSaveMarks({
        exam: selectedExam,
        schoolClass: selectedClass,
        section: selectedSection,
        subject: selectedSubject,
        records,
      });

      if (res.success) {
        message.success(`Saved marks for ${records.length} students successfully!`);
      }
    } catch (err) {
      message.error('Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExam = async (values) => {
    try {
      const payload = {
        ...values,
        startDate: values.dateRange?.[0]?.toISOString(),
        endDate: values.dateRange?.[1]?.toISOString(),
      };
      await schoolService.create('exam', payload);
      message.success('Exam created successfully');
      setIsExamModalOpen(false);
      examForm.resetFields();
      fetchBasics();
    } catch (err) {
      message.error('Failed to create exam');
    }
  };

  const loadReportCard = async (studentId) => {
    if (!studentId) return;
    setReportLoading(true);
    try {
      const res = await schoolService.getStudentReportCard(studentId);
      if (res.success) {
        setReportCardData(res.result);
      }
    } catch (err) {
      message.error('Failed to fetch report card');
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (reportStudentId) {
      loadReportCard(reportStudentId);
    }
  }, [reportStudentId]);

  const marksColumns = [
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
      title: 'Attendance',
      key: 'isAbsent',
      width: 110,
      render: (_, r) => {
        const isAbsent = Boolean(marksMap[r._id]?.isAbsent);
        return (
          <Button
            size="small"
            type={isAbsent ? 'primary' : 'default'}
            danger={isAbsent}
            onClick={() => handleAbsentToggle(r._id, !isAbsent)}
          >
            {isAbsent ? 'Absent (AB)' : 'Present'}
          </Button>
        );
      },
    },
    {
      title: 'Marks Obtained (Out of 100)',
      key: 'marksObtained',
      width: 200,
      render: (_, r) => {
        const isAbsent = Boolean(marksMap[r._id]?.isAbsent);
        const val = isAbsent ? 0 : (marksMap[r._id]?.marksObtained ?? 0);
        return (
          <InputNumber
            min={0}
            max={100}
            disabled={isAbsent}
            value={val}
            onChange={(newVal) => handleMarksChange(r._id, newVal)}
            style={{ width: 120 }}
          />
        );
      },
    },
    {
      title: 'Computed Grade',
      key: 'grade',
      width: 140,
      render: (_, r) => {
        const isAbsent = Boolean(marksMap[r._id]?.isAbsent);
        const val = marksMap[r._id]?.marksObtained ?? 0;
        const g = computeGrade(val, 100, isAbsent);
        return <Tag color={g.color} style={{ fontSize: 14, fontWeight: 'bold' }}>{g.grade}</Tag>;
      },
    },
    {
      title: 'Teacher Feedback / Remarks',
      key: 'remarks',
      render: (_, r) => (
        <Input
          placeholder="e.g. Excellent progress"
          value={marksMap[r._id]?.remarks || ''}
          onChange={(e) => handleRemarksChange(r._id, e.target.value)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            📝 Examination & Marks Entry Hub
          </Title>
          <Text type="secondary">
            Enter subject assessment marks, auto-compute letter grades, publish results, and generate report cards.
          </Text>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsExamModalOpen(true)}>
            Schedule New Exam
          </Button>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="entry"
        items={[
          {
            key: 'entry',
            label: 'Marks Entry Sheet',
            children: (
              <>
                <Card bordered={false} style={{ borderRadius: 12, marginBottom: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                  <Row gutter={[16, 16]} align="middle" justify="space-between">
                    <Col xs={24} md={18}>
                      <Space wrap size="middle">
                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 4 }}>Select Exam:</Text>
                          <Select style={{ width: 200 }} value={selectedExam} onChange={setSelectedExam}>
                            {exams.map((e) => (
                              <Select.Option key={e._id} value={e._id}>
                                {e.name}
                              </Select.Option>
                            ))}
                          </Select>
                        </div>

                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 4 }}>Class:</Text>
                          <Select style={{ width: 140 }} value={selectedClass} onChange={setSelectedClass}>
                            {classes.map((c) => (
                              <Select.Option key={c._id} value={c._id}>
                                {c.name}
                              </Select.Option>
                            ))}
                          </Select>
                        </div>

                        <div>
                          <Text strong style={{ display: 'block', marginBottom: 4 }}>Subject:</Text>
                          <Select style={{ width: 180 }} value={selectedSubject} onChange={setSelectedSubject}>
                            {subjects.map((s) => (
                              <Select.Option key={s._id} value={s._id}>
                                {s.name} ({s.code})
                              </Select.Option>
                            ))}
                          </Select>
                        </div>
                      </Space>
                    </Col>

                    <Col xs={24} md={6} style={{ textAlign: 'right' }}>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={saveMarks}
                        style={{ background: '#16a34a', borderColor: '#16a34a' }}
                      >
                        Save & Publish Marks
                      </Button>
                    </Col>
                  </Row>
                </Card>

                <Card bordered={false} style={{ borderRadius: 12 }}>
                  <Table
                    dataSource={students}
                    columns={marksColumns}
                    rowKey="_id"
                    loading={loading}
                    pagination={false}
                  />
                </Card>
              </>
            ),
          },
          {
            key: 'reportCard',
            label: 'Student Report Cards & Transcripts',
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Text strong>Select Student for Report Card:</Text>
                  <Select
                    style={{ width: 280 }}
                    value={reportStudentId}
                    onChange={setReportStudentId}
                  >
                    {students.map((s) => (
                      <Select.Option key={s._id} value={s._id}>
                        {s.name} {s.surname} (Roll #{s.rollNumber})
                      </Select.Option>
                    ))}
                  </Select>
                  <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                    Print Transcript
                  </Button>
                </div>

                {reportCardData && (
                  <div
                    style={{
                      background: '#fff',
                      border: '2px solid #e2e8f0',
                      borderRadius: 12,
                      padding: 32,
                      maxWidth: 800,
                      margin: '0 auto',
                    }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                      <Title level={3} style={{ margin: 0, color: '#1e3a8a' }}>
                        ACADEMIC ACHIEVEMENT TRANSCRIPT
                      </Title>
                      <Text type="secondary">Official Student Performance Report</Text>
                    </div>

                    <Divider />

                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                      <Col span={12}>
                        <Text strong>Student Name: </Text>
                        <Text>{reportCardData.student?.name} {reportCardData.student?.surname}</Text>
                      </Col>
                      <Col span={12}>
                        <Text strong>Admission #: </Text>
                        <Text>{reportCardData.student?.admissionNumber}</Text>
                      </Col>
                      <Col span={12}>
                        <Text strong>Class: </Text>
                        <Text>{reportCardData.student?.schoolClass?.name || 'Grade 10'}</Text>
                      </Col>
                      <Col span={12}>
                        <Text strong>Roll Number: </Text>
                        <Text>#{reportCardData.student?.rollNumber}</Text>
                      </Col>
                    </Row>

                    <Table
                      dataSource={reportCardData.results || []}
                      rowKey="_id"
                      pagination={false}
                      columns={[
                        {
                          title: 'Subject',
                          dataIndex: 'subject',
                          key: 'subject',
                          render: (s) => s?.name || 'Subject',
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
                        },
                        {
                          title: 'Grade',
                          dataIndex: 'grade',
                          key: 'grade',
                          render: (g) => <Tag color="blue">{g}</Tag>,
                        },
                        {
                          title: 'Remarks',
                          dataIndex: 'remarks',
                          key: 'remarks',
                        },
                      ]}
                    />

                    <div
                      style={{
                        marginTop: 24,
                        padding: 16,
                        background: '#f8fafc',
                        borderRadius: 8,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <Text strong style={{ fontSize: 16 }}>Overall Score: </Text>
                        <Text style={{ fontSize: 16, color: '#0369a1' }}>
                          {reportCardData.totalObtained} / {reportCardData.totalMax} ({reportCardData.percentage}%)
                        </Text>
                      </div>
                      <div>
                        <Text strong style={{ fontSize: 16 }}>Grade Awarded: </Text>
                        <Tag color="green" style={{ fontSize: 16, padding: '2px 10px' }}>
                          {reportCardData.overallGrade}
                        </Tag>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* Schedule Exam Modal */}
      <Modal
        title="Schedule New Examination"
        open={isExamModalOpen}
        onCancel={() => setIsExamModalOpen(false)}
        onOk={() => examForm.submit()}
      >
        <Form form={examForm} layout="vertical" onFinish={handleCreateExam}>
          <Form.Item name="name" label="Exam Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Final Term Examination 2026" />
          </Form.Item>
          <Form.Item name="academicYear" label="Academic Year" initialValue="2026-2027">
            <Input placeholder="2026-2027" />
          </Form.Item>
          <Form.Item name="dateRange" label="Examination Schedule Dates" rules={[{ required: true }]}>
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="Instructions / Description">
            <Input.TextArea rows={2} placeholder="Syllabus, hall instructions" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

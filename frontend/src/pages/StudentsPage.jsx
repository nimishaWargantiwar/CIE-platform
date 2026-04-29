// ==========================================
// Students Page — List + Excel Import
// ==========================================

import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function StudentsPage() {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState({ rollNo: '', name: '' });
  const [editForm, setEditForm] = useState({ rollNo: '', name: '' });

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { if (selectedClass && selectedYear) loadStudents(); }, [selectedClass, selectedYear]);

  const loadMeta = async () => {
    const [c, y] = await Promise.all([api.get('/classes'), api.get('/academic-years')]);
    setClasses(c.data);
    setYears(y.data);
    if (c.data.length && y.data.length) {
      setSelectedClass(c.data[0]._id);
      setSelectedYear(y.data[0]._id);
    }
  };

  const loadStudents = async () => {
    const { data } = await api.get(`/students?class=${selectedClass}&academicYear=${selectedYear}`);
    setStudents(data);
  };

  const handleImport = async () => {
    if (!importFile) return toast.error('Select a file');
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('classId', selectedClass);
      fd.append('academicYearId', selectedYear);
      const { data } = await api.post('/students/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(data.message);
      setShowImport(false);
      setImportFile(null);
      loadStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/students', {
        ...form,
        class: selectedClass,
        academicYear: selectedYear,
      });
      toast.success('Student added!');
      setShowAddModal(false);
      setForm({ rollNo: '', name: '' });
      loadStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student?')) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success('Deleted!');
      loadStudents();
    } catch (err) {
      toast.error('Error deleting');
    }
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    setEditForm({ rollNo: student.rollNo, name: student.name });
    setShowEditModal(true);
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/students/${editingStudent._id}`, editForm);
      toast.success('Student updated!');
      setShowEditModal(false);
      setEditingStudent(null);
      loadStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Students</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)} className="btn-secondary">📥 Import Excel</button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">+ Add Student</button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="input w-48">
          {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
        </select>
        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input w-48">
          {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <span className="self-center text-sm text-gray-500">{students.length} students</span>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500">#</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Roll No</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
              {isAdmin && <th className="px-6 py-3 text-right font-medium text-gray-500">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.map((s, idx) => (
              <tr key={s._id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-400">{idx + 1}</td>
                <td className="px-6 py-3 font-medium">{s.rollNo}</td>
                <td className="px-6 py-3">{s.name}</td>
                {isAdmin && (
                  <td className="px-6 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(s)} className="text-primary-600 hover:underline text-sm">Edit</button>
                    <button onClick={() => handleDelete(s._id)} className="text-red-600 hover:underline text-sm">Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && <p className="text-center text-gray-400 py-8">No students in this class.</p>}
      </div>

      {/* Import Modal */}
      <Modal show={showImport} onClose={() => setShowImport(false)} title="Import Students from Excel">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Upload an Excel file with columns: <strong>Roll No</strong>, <strong>Name</strong> (first row as header).</p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setImportFile(e.target.files[0])}
            className="input"
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowImport(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleImport} disabled={importing} className="btn-primary">
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Student Modal */}
      <Modal show={showAddModal} onClose={() => setShowAddModal(false)} title="Add Student">
        <form onSubmit={handleAddStudent} className="space-y-4">
          <div>
            <label className="label">Roll No</label>
            <input value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} required className="input" />
          </div>
          <div>
            <label className="label">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Add</button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal show={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Student">
        <form onSubmit={handleEditStudent} className="space-y-4">
          <div>
            <label className="label">Roll No</label>
            <input value={editForm.rollNo} onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })} required className="input" />
          </div>
          <div>
            <label className="label">Name</label>
            <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required className="input" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ==========================================
// Activities Page â€” List + Create wizard
// ==========================================

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const DEFAULT_ACTIVITY_TYPES = ['PPT', 'Flip Classroom', 'GD', 'Viva', 'Lab', 'Assignment', 'Quiz', 'Project', 'Seminar', 'Other'];

function uniqueNonEmptyTypes(types = []) {
  const seen = new Set();
  return types
    .map((type) => `${type || ''}`.trim())
    .filter((type) => {
      if (!type) return false;
      const key = type.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export default function ActivitiesPage() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [activities, setActivities] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', activityType: 'PPT', subjectName: '', classId: '', academicYearId: '', totalMarks: 10, topic: '' });
  const [activityTypes, setActivityTypes] = useState(DEFAULT_ACTIVITY_TYPES);
  const [facultyFilter, setFacultyFilter] = useState('all');
  const [facultySearch, setFacultySearch] = useState('');

  useEffect(() => { loadMeta(); }, []);

  const loadMeta = async () => {
    const query = isAdmin ? '?includeUnpublished=true' : '';
    const [c, y, g, t] = await Promise.all([
      api.get('/classes'),
      api.get('/academic-years'),
      api.get(`/learning/guides${query}`).catch(() => ({ data: { guides: [] } })),
      isAdmin ? api.get('/admin/templates').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ]);
    setClasses(c.data);
    setYears(y.data);

    const guideTypes = (g.data?.guides || []).map((guide) => guide?.activityType || '');
    const templateTypes = Array.isArray(t.data) ? t.data.map((template) => template?.activityType || '') : [];
    const mergedTypes = uniqueNonEmptyTypes([...templateTypes, ...guideTypes]);
    setActivityTypes(mergedTypes.length ? mergedTypes : DEFAULT_ACTIVITY_TYPES);

    if (c.data.length) setForm((f) => ({ ...f, classId: c.data[0]._id }));
    if (y.data.length) setForm((f) => ({ ...f, academicYearId: y.data[0]._id }));
    loadActivities();
  };

  const loadActivities = async () => {
    const { data } = await api.get('/activities');
    setActivities(data);
  };

  const openCreate = () => {
    const preferredType = activityTypes.includes('PPT') ? 'PPT' : (activityTypes[0] || 'PPT');
    setForm({
      name: '', activityType: preferredType, subjectName: '',
      classId: classes.length ? classes[0]._id : '',
      academicYearId: years.length ? years[0]._id : '',
      totalMarks: 10, topic: '',
    });
    setShowModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/activities', form);
      toast.success('Activity created! Default rubrics applied.');
      setShowModal(false);
      loadActivities();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  // Get unique faculty list for admin filter
  const facultyList = isAdmin
    ? [...new Map(activities.filter(a => a.faculty).map(a => [a.faculty._id, a.faculty])).values()]
    : [];

  // Group activities by faculty for admin view
  const getGroupedActivities = () => {
    let filtered = facultyFilter === 'all'
      ? activities
      : activities.filter(a => a.faculty?._id === facultyFilter);

    // Apply faculty search
    if (isAdmin && facultySearch.trim()) {
      const q = facultySearch.trim().toLowerCase();
      filtered = filtered.filter(a =>
        a.faculty?.name?.toLowerCase().includes(q) ||
        a.faculty?.email?.toLowerCase().includes(q)
      );
    }

    if (!isAdmin) return [{ faculty: null, items: filtered }];

    const groups = {};
    filtered.forEach(a => {
      const fId = a.faculty?._id || 'unknown';
      const fName = a.faculty?.name || 'Unknown Faculty';
      const fEmail = a.faculty?.email || '';
      if (!groups[fId]) groups[fId] = { faculty: { _id: fId, name: fName, email: fEmail }, items: [] };
      groups[fId].items.push(a);
    });
    return Object.values(groups).sort((a, b) => a.faculty.name.localeCompare(b.faculty.name));
  };

  const grouped = getGroupedActivities();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Activities</h1>
        <button onClick={openCreate} className="btn-primary">+ Create Activity</button>
      </div>

      {/* Admin: Faculty filter & search */}
      {isAdmin && facultyList.length > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <label className="text-sm font-medium text-gray-600">Filter by Faculty:</label>
          <select
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            className="input w-64"
          >
            <option value="all">All Faculty ({activities.length} activities)</option>
            {facultyList.map(f => (
              <option key={f._id} value={f._id}>
                {f.name} ({activities.filter(a => a.faculty?._id === f._id).length})
              </option>
            ))}
          </select>
          <input
            value={facultySearch}
            onChange={(e) => { setFacultySearch(e.target.value); setFacultyFilter('all'); }}
            placeholder="ðŸ” Search faculty name..."
            className="input w-64"
          />
        </div>
      )}

      {/* Activities grouped by faculty (admin) or flat list (faculty) */}
      {grouped.map((group, gIdx) => (
        <div key={group.faculty?._id || gIdx} className="mb-8">
          {isAdmin && group.faculty && (
            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-200">
              <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm">
                {group.faculty.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{group.faculty.name}</h2>
                <p className="text-xs text-gray-400">{group.faculty.email} Â· {group.items.length} activit{group.items.length === 1 ? 'y' : 'ies'}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((a) => (
              <div key={a._id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition group">
                <Link to={`/activities/${a._id}`} className="block">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary-600">{a.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      a.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      a.status === 'submitted' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{a.activityType}</p>
                  <p className="text-sm text-gray-500 mt-1">Total Marks: <strong>{a.totalMarks}</strong></p>
                  <div className="mt-3 flex gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {a.subject?.code || a.subject?.name}
                    </span>
                    {a.subject?.class?.name && (
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                        Class: {a.subject.class.name}
                      </span>
                    )}
                    {isAdmin && a.faculty && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                        {a.faculty.name}
                      </span>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      ))}

      {activities.length === 0 && (
        <div className="text-center text-gray-400 py-12">No activities yet. Create one to get started.</div>
      )}

      {/* Create Activity Modal */}
      <Modal show={showModal} onClose={() => setShowModal(false)} title="Create CIE Activity" wide>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">CIE Title</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="input" placeholder="e.g. CIE-1" />
            </div>
            <div>
              <label className="label">Activity Type</label>
              <select value={form.activityType} onChange={(e) => setForm({ ...form, activityType: e.target.value })} className="input">
                {activityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Subject Name</label>
            <input value={form.subjectName} onChange={(e) => setForm({ ...form, subjectName: e.target.value })} required className="input" placeholder="e.g. Data Structures & Algorithms" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Class</label>
              <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required className="input">
                {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Academic Year</label>
              <select value={form.academicYearId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value })} required className="input">
                {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Total Marks</label>
              <input type="number" min="1" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: parseInt(e.target.value) || 1 })} required className="input" />
            </div>
          </div>
          <div>
            <label className="label">Topic</label>
            <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="input" placeholder="Activity topic" />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Activity</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchData = () => {
    api.get(`/patients/${id}`).then((res) => setPatient(res.data.patient));
    api.get(`/reports/${id}`).then((res) => setReports(res.data.reports));
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setUploading(true);
    const formData = new FormData();
    formData.append('reportFile', file);

    try {
      await api.post(`/reports/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await api.post(`/patients/${id}/notes`, { text: newNote });
      setPatient(res.data.patient);
      setNewNote('');
    } finally {
      setAddingNote(false);
    }
  };

  if (!patient) {
    return (
      <Layout>
        <p className="text-muted-foreground text-sm py-4">Loading...</p>
      </Layout>
    );
  }

  const sortedNotes = [...patient.notes].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <Layout>
      {/* Patient Header Section */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{patient.name}</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {patient.age ? `${patient.age} yrs` : ''} {patient.gender !== 'unspecified' ? `· ${patient.gender}` : ''}
          {patient.patientIdentifier ? ` · ID: ${patient.patientIdentifier}` : ''}
        </p>

        {/* Clinical Notes Card */}
        <div className="mt-4 bg-card border border-border rounded-lg p-3.5 sm:p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Clinical Notes
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:items-end">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder="Add a note for today's visit..."
              rows={1}
              className="w-full flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring max-h-40 overflow-y-auto"
            />
            <Button 
              onClick={handleAddNote} 
              disabled={addingNote || !newNote.trim()}
              className="w-full sm:w-auto shrink-0"
            >
              {addingNote ? 'Adding...' : 'Add'}
            </Button>
          </div>

          {sortedNotes.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <div className="space-y-3">
              {sortedNotes.map((note) => (
                <div key={note._id} className="border-l-2 border-green-300 pl-3 py-0.5">
                  <p className="text-[11px] sm:text-xs text-muted-foreground mb-0.5">
                    {new Date(note.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">{note.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reports Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">Reports</h2>
        <label className="w-full sm:w-auto">
          <Button asChild disabled={uploading} className="w-full sm:w-auto">
            <span>{uploading ? 'Uploading...' : '+ Upload Report'}</span>
          </Button>
          <input type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
        </label>
      </div>

      {error && <p className="text-xs sm:text-sm text-destructive mb-4">{error}</p>}

      {/* Reports List */}
      {reports.length === 0 ? (
        <p className="text-muted-foreground text-xs sm:text-sm">No reports uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <Link
              key={report._id}
              to={`/reports/${report._id}`}
              className="block bg-card border border-border rounded-lg p-3.5 sm:p-4 hover:border-primary transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground text-xs sm:text-sm truncate min-w-0 flex-1">
                  {report.originalFileName}
                </p>
                <span
                  className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium shrink-0 capitalize ${
                    report.status === 'analyzed'
                      ? 'bg-green-100 text-green-900 dark:bg-green-950/60 dark:text-green-300'
                      : report.status === 'failed'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {report.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
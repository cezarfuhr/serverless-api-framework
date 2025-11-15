import { useState } from 'react';
import { emailApi } from '../api/email';
import { EmailInput } from '../types';
import './EmailPage.css';

export const EmailPage = () => {
  const [formData, setFormData] = useState<EmailInput>({
    to: [],
    subject: '',
    body: '',
    html: '',
  });
  const [toEmail, setToEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAddEmail = () => {
    if (toEmail && !formData.to.includes(toEmail)) {
      setFormData({ ...formData, to: [...formData.to, toEmail] });
      setToEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setFormData({
      ...formData,
      to: formData.to.filter((e) => e !== email),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await emailApi.send(formData);
      setSuccess('Email sent successfully!');
      setFormData({ to: [], subject: '', body: '', html: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Send Email</h1>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <form onSubmit={handleSubmit} className="email-form">
        <div className="form-group">
          <label>Recipients</label>
          <div className="email-input-group">
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="Enter email address"
            />
            <button type="button" onClick={handleAddEmail}>
              Add
            </button>
          </div>
          <div className="email-tags">
            {formData.to.map((email) => (
              <span key={email} className="email-tag">
                {email}
                <button type="button" onClick={() => handleRemoveEmail(email)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Subject</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Body (Plain Text)</label>
          <textarea
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            rows={6}
            required
          />
        </div>

        <div className="form-group">
          <label>HTML Body (Optional)</label>
          <textarea
            value={formData.html}
            onChange={(e) => setFormData({ ...formData, html: e.target.value })}
            rows={6}
          />
        </div>

        <button type="submit" disabled={loading || formData.to.length === 0}>
          {loading ? 'Sending...' : 'Send Email'}
        </button>
      </form>
    </div>
  );
};

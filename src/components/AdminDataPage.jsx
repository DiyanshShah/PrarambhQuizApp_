import React, { useEffect, useState } from 'react';

const apiUrl = import.meta.env.VITE_API_URL;

const Table = ({ title, data }) => {
  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]);

  return (
    <div className="section">
      <h2>{title}</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx}>
                {headers.map((key) => (
                  <td key={key}>{String(row[key])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function AdminDataPage() {
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/api/admin/all-data`)
      .then(res => res.json())
      .then(data => {
        setAdminData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container">
      <h1>Admin Data Overview</h1>
      {loading && <p>Loading data...</p>}
      {!loading && adminData && (
        <>
          <Table title="Users" data={adminData.users} />
          <Table title="Quiz Results" data={adminData.quiz_results} />
          <Table title="Round 3 Submissions" data={adminData.round3_submissions} />
          <Table title="Round Access" data={adminData.round_access} />
          <Table title="User Scores" data={adminData.user_scores} />
        </>
      )}
      {!loading && !adminData && <p>No data available.</p>}
    </div>
  );
}

export default AdminDataPage;
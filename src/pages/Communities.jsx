import { Outlet, useNavigate } from 'react-router-dom';

function Communities() {
  const navigate = useNavigate();

  return (
    <div>
      <div style={tabContainer}>
        <button onClick={() => navigate('/communities/recommended')}>Recommended</button>
        <button onClick={() => navigate('/communities/my')}>My Communities</button>
        <button onClick={() => navigate('/communities/create')}>Create</button>
      </div>

      <Outlet />
    </div>
  );
}

const tabContainer = {
  display: 'flex',
  justifyContent: 'center',
  gap: '10px',
  marginBottom: '20px',
};

export default Communities;

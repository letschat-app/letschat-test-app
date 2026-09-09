import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CommunityCreationPage() {
  const [name, setName] = useState('');
  const [motto, setMotto] = useState('');
  const [type, setType] = useState('public');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare JSON Body
    const requestBody = {
      communityName: name,
      motto: motto,
      type: type,
    };
    console.log(localStorage.getItem("userid"))
    try {
      const response = await fetch('http://localhost:8080/api/community/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id':localStorage.getItem("userid"),
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.text();
        console.log('Community Created:', result);
        navigate('/communities/my');  // Navigate to My Communities after creation
      } else {
        console.error('Failed to create community');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Create Community</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
        <input
          type="text"
          placeholder="Community Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Motto (optional)"
          value={motto}
          onChange={(e) => setMotto(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <button type="submit">Create</button>
      </form>
    </div>
  );
}

export default CommunityCreationPage;

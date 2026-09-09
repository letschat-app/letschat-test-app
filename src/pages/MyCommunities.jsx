import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
function MyCommunities() {

  const[communityname,setcommunityname]=useState([]);
    const navigate = useNavigate();
  useEffect(()=>{
        const userId = localStorage.getItem("userid");
        fetch('http://localhost:8080/api/community/fetch/mycommunity', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': userId,
        }
        })
        .then(res=>res.json())
        .then(data=>{setcommunityname(data);console.log(data)});
  },[]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>My Communities</h2>
      <table border="1" cellPadding="10" cellSpacing="0" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead style={{ backgroundColor: "#f0f0f0",color:"#000" }}>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Motto</th>
            <th>Followers</th>
          </tr>
        </thead>
        <tbody>
          {communityname.map(community => (
            <tr key={community.communityId}  style={{ cursor: "pointer" }}>
              <td>{community.communityId}</td>
              <td>{community.communityName}</td>
              <td>{community.motto}</td>
              <td>{community.followers}</td>
              <td>
                <button onClick={()=>{navigate(`/post/${community.communityId}`);console.log(community)}}>post</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MyCommunities;

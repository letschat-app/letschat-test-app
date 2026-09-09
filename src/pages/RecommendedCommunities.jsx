import { useEffect, useState } from "react";

function RecommendedCommunities() {
const[communityname,setcommunityname]=useState([]);
//const[cid,setcid]=useState(null);
  const[follow,setfollow]=useState({});
  useEffect(()=>{
        const userId = localStorage.getItem("userid");
        fetch('http://localhost:8080/api/community/fetch/any', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': userId,
        }
        })
        .then(res=>res.json())
        .then(data=>{setcommunityname(data);console.log(data)});
  },[]);

  const follows=((cid)=>{
    if(cid===null) return;
     const userId = localStorage.getItem("userid");
        fetch(`http://localhost:8080/api/community/follow/${cid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': userId,
        }})
        .then(res => res.text())
        .then(data => {
          console.log(data);
            if (data === "following") {
            console.log("Successfully followed!");
            setfollow(prev => ({
            ...prev,
              [cid]: true
            }));
            } else {
            console.log("Follow failed or already following");
            }
        });
        
  })

  const unfollows=((cid)=>{
    if(cid===null) return;
     const userId = localStorage.getItem("userid");
        fetch(`http://localhost:8080/api/community/unfollow/${cid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': userId,
        }})
        .then(res => res.text())
        .then(data => {
          console.log(data);
            if (data === "unfollowed") {
            console.log("Successfully unfollowed!");
            removeItem(cid);
            } else {
            console.log("unFollow failed or already following");
            }
        });
        
  })

   const removeItem = (item) => {
    const newSet = new Set(follow);  // Clone the Set
    newSet.delete(item);                    // Remove item
    setfollow(newSet);               // Update state
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Recommended Communities</h2>
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
                <button
                 onClick={() =>
                  follow[community.communityId]
                    ? unfollows(community.communityId)
                    : follows(community.communityId)
                }
                  // Disable if already followed
                style={{
                  padding: "5px 10px",
                  backgroundColor: follow[community.communityId] ? "#28a745" : "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  cursor: follow[community.communityId] ? "default" : "pointer"
                }}
              >
                {follow[community.communityId] ? "Unfollow" : "Follow"}
              </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RecommendedCommunities;

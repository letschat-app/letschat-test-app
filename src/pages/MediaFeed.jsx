// import React, { useEffect, useRef, useState, useCallback } from "react";

// export default function MediaFeed() {
//   const [mediaList, setMediaList] = useState([]);
//   const [page, setPage] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const observer = useRef();
//   const mediaRefs = useRef({});
//   const autoplayObserver = useRef();

//   // Fetch media from API
//   const fetchMedia = async (pageNum) => {
//     setLoading(true);
//     try {
//         console.log("feeding");
//       const res = await fetch('http://localhost:8080/api/files/fetch/feed',{
//         method:'GET',
//         headers: {
//           'Content-Type': 'application/json',
//           'User-Id':localStorage.getItem("userid"),
//         }
//       });
//       const data = await res.json();
//       console.log(data);
//       setMediaList((prev) => [...prev, ...data]);
//     } catch (error) {
//       console.error("Error fetching media:", error);
//     }
//     setLoading(false);
//   };

//   // Infinite scroll observer
//   const lastMediaRef = useCallback(
//     (node) => {
//       if (loading) return;
//       if (observer.current) observer.current.disconnect();

//       observer.current = new IntersectionObserver((entries) => {
//         if (entries[0].isIntersecting) {
//           setPage((prev) => prev + 1);
//         }
//       });

//       if (node) observer.current.observe(node);
//     },
//     [loading]
//   );

//   // Autoplay observer for videos
//   useEffect(() => {
//     autoplayObserver.current = new IntersectionObserver(
//       (entries) => {
//         entries.forEach((entry) => {
//           const el = entry.target;
//           if (el.tagName === "VIDEO") {
//             if (entry.isIntersecting) {
//               el.play().catch(() => {});
//             } else {
//               el.pause();
//             }
//           }
//         });
//       },
//       { threshold: 0.7 }
//     );
//   }, []);

//   // Initial fetch + load more
//   useEffect(() => {
//     fetchMedia(page);
//   }, [page]);

//   // Attach autoplay observer
//   useEffect(() => {
//     mediaList.forEach((item) => {
//       const el = mediaRefs.current[item.id];
//       if (el && item.type === "video") {
//         autoplayObserver.current.observe(el);
//       }
//     });
//   }, [mediaList]);

//   const videoRef=useRef(null);
//   const[ismuted,setismuted]=useState(
//     mediaList.reduce((acc,video)=>{
//       acc[video.videoName]=true;
//       return acc;
//     },{})
//   );
//   const togglemute=(name)=>{
//     console.log("chaning")
//     setismuted((prev)=>({
//       ...prev,
//       [id]:!prev[name],
//     }));
//   }
  
//   return (
//     <div style={{maxWidth:"400px",height:"100%",position:"relative"}}>
//     <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
//       {mediaList.map((item, index) => {
//         const isLast = index === mediaList.length - 1;
//         console.log("inside")
//         // Media wrapper styles
//         const wrapperStyle = {
//           position: "relative",
//           width: "100%",
//           maxWidth: "800px",
//           margin: "0 auto",
//           backgroundColor: "#000",
//           borderRadius: "8px",
//           overflow: "hidden",
//           // display:"flex",
//           // justifyContent:"center",
//           // alignItems:"center",
//         };

//         // Video/Image common styles
//         const mediaStyle = {
//           display: "block",
//           maxWidth: "100%",
//           maxHeight: "80vh",
//           width:"100%",
//           height:"100%",
//           objectFit: "cover",
//           backgroundColor: "#000",
//         };

//         // Overlay styles
//         const overlayStyle = {
//           position: "absolute",
//           bottom: 0,
//           left: 0,
//           width: "100%",
//           padding: "12px",
//           background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
//           color: "#fff",
//         };

//         const mediaElement =
//           item.type === "video" ? (
//             <div onClick={()=>togglemute[item.videoName]}>
//             <video
//               key={item.videoName}
//               ref={(el) => (mediaRefs.current[item.videoName] = el)}
//               loop
//               muted={ismuted}
//               onClick={()=>togglemute[item.videoName]}
//               playsInline
//               preload="metadata"
//               controls={false}
//               style={mediaStyle}
//               autoPlay
//             >
//               <source src={`http://localhost:8080/api/files/stream/${item.videoPath}`} type="video/mp4" />
//             </video></div>
//           ) : (
//             <img
//               key={item.videoName}
//               ref={(el) => (mediaRefs.current[item.videoName] = el)}
//               src={`http://localhost:8080/api/files/stream/${item.videoPath}`}
//               alt={item.name || ""}
//               style={mediaStyle}
//             />
//           );

//         const content = (
//           <div key={item.videoName} style={wrapperStyle}>
//             {mediaElement}
//             <div style={overlayStyle}>
//               <h3 style={{ margin: "0 0 5px 0" }}>{item.videoName}</h3>
//               <p style={{ margin: "0 0 5px 0", fontSize: "14px", opacity: 0.85 }}>
//                 {item.description}
//               </p>
//               <div style={{ fontSize: "13px", opacity: 0.9 }}>
//                 Community: <b>{item.communityName}</b>
//               </div>
//               <div style={{ display: "flex", gap: "15px", marginTop: "5px", fontSize: "14px" }}>
//                 <span>👍 {item.likes}</span>
//                 <span>👎 {item.dislikes}</span>
//               </div>
//             </div>
//           </div>
//         );

//         return isLast ? (
//           <div key={item.videoName} ref={lastMediaRef}>
//             {content}
//           </div>
//         ) : (
//           content
//         );
//       })}

//       {loading && <p style={{ textAlign: "center" }}>Loading more...</p>}
//     </div>
//     </div>
//   );
// }





import React, { useEffect, useRef, useState, useCallback } from "react";

export default function MediaFeed() {
  const [mediaList, setMediaList] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const observer = useRef();
  const mediaRefs = useRef({});
  const autoplayObserver = useRef();

  const [ismuted, setIsMuted] = useState({});

  // Fetch media from API
  const fetchMedia = async (pageNum) => {
    setLoading(true);
    try {
      console.log("feeding");
      const res = await fetch("http://localhost:8080/api/files/fetch/feed", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Id": localStorage.getItem("userid"),
        },
      });
      const data = await res.json();
      console.log(data);

      // set default muted = true for new videos
      const newMuted = {};
      data.forEach((video) => {
        if (video.type === "video") newMuted[video.videoName] = true;
      });

      setIsMuted((prev) => ({ ...prev, ...newMuted }));
      setMediaList((prev) => [...prev, ...data]);
    } catch (error) {
      console.error("Error fetching media:", error);
    }
    setLoading(false);
  };

  // Infinite scroll observer
  const lastMediaRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading]
  );

  // Autoplay observer for videos
  useEffect(() => {
    autoplayObserver.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (el.tagName === "VIDEO") {
            if (entry.isIntersecting) {
              el.play().catch(() => {});
            } else {
              el.pause();
            }
          }
        });
      },
      { threshold: 0.7 }
    );
  }, []);

  // Initial fetch + load more
  useEffect(() => {
    fetchMedia(page);
  }, [page]);

  // Attach autoplay observer
  useEffect(() => {
    mediaList.forEach((item) => {
      const el = mediaRefs.current[item.videoName];
      if (el && item.type === "video") {
        autoplayObserver.current.observe(el);
      }
    });
  }, [mediaList]);

  // toggle mute/unmute
  const toggleMute = (name) => {
    setIsMuted((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <div style={{ maxWidth: "400px", height: "100%", position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
        {mediaList.map((item, index) => {
          const isLast = index === mediaList.length - 1;

          const wrapperStyle = {
            position: "relative",
            width: "100%",
            maxWidth: "800px",
            margin: "0 auto",
            backgroundColor: "#000",
            borderRadius: "8px",
            overflow: "hidden",
          };

          const mediaStyle = {
            display: "block",
            maxWidth: "100%",
            maxHeight: "80vh",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            backgroundColor: "#000",
            cursor: item.type === "video" ? "pointer" : "default",
          };

          const overlayStyle = {
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            padding: "12px",
            background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
            color: "#fff",
          };

          const mediaElement =
            item.type === "video" ? (
              <video
                key={item.videoName}
                ref={(el) => (mediaRefs.current[item.videoName] = el)}
                loop
                muted={ismuted[item.videoName]}
                playsInline
                preload="metadata"
                controls={false}
                style={mediaStyle}
                autoPlay
                onClick={() => toggleMute(item.videoName)}
              >
                <source
                  src={`http://localhost:8080/api/files/stream/${item.videoPath}`}
                  type="video/mp4"
                />
              </video>
            ) : (
              <img
                key={item.videoName}
                ref={(el) => (mediaRefs.current[item.videoName] = el)}
                src={`http://localhost:8080/api/files/stream/${item.videoPath}`}
                alt={item.name || ""}
                style={mediaStyle}
              />
            );

          const content = (
            <div key={item.videoName} style={wrapperStyle}>
              {mediaElement}
              <div style={overlayStyle}>
                <h3 style={{ margin: "0 0 5px 0" }}>{item.videoName}</h3>
                <p
                  style={{
                    margin: "0 0 5px 0",
                    fontSize: "14px",
                    opacity: 0.85,
                  }}
                >
                  {item.description}
                </p>
                <div style={{ fontSize: "13px", opacity: 0.9 }}>
                  Community: <b>{item.communityName}</b>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "15px",
                    marginTop: "5px",
                    fontSize: "14px",
                  }}
                >
                  <span>👍 {item.likes}</span>
                  <span>👎 {item.dislikes}</span>
                </div>
              </div>
            </div>
          );

          return isLast ? (
            <div key={item.videoName} ref={lastMediaRef}>
              {content}
            </div>
          ) : (
            content
          );
        })}

        {loading && <p style={{ textAlign: "center" }}>Loading more...</p>}
      </div>
    </div>
  );
}

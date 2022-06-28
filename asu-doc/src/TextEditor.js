import React, { useCallback, useEffect, useState, useRef } from 'react'
import Quill from 'quill'
import QuillCursors from 'quill-cursors';
import "quill/dist/quill.snow.css"
import {io} from 'socket.io-client'
import { useParams } from 'react-router-dom'


const SAVE_INTERVAL_MS = 1000
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
]

Quill.register("modules/cursors", QuillCursors);

// Constant to simulate a high-latency connection when sending cursor
// position updates.
const CURSOR_LATENCY = 0;
let randomColor = Math.floor((Math.random()+0.1)*16000000).toString(16);
let randomColorCode = `#${randomColor}`

// Constant to simulate a high-latency connection when sending
// text changes.

let q = ''

let user = window.prompt("Enter user name");

const colors = ["#5551FF", "#0FA958"];

const getUserColor = (index) => colors[index % colors.length];

let cursors = ''

let deltaArray = []
      
export default function TextEditor() {
  const {id: documentId} = useParams()
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();
  
  
  // const [user, setUser] = useState(null);
  // const [doc, setDoc] = useState(null);
  // const [presences, setPresences] = useState({});
  // const [error, setError] = useState(null);
  // const connectedRef = useRef(false);
  // const editorRef = useRef(null);
  // const mousePointerRef = useRef(null);
  // const editorCursorRef = useRef(null);
// http://52.73.111.17


 // setup connection to the server using socket.io
 // this useEffect is called only once.
  useEffect(()=>{
    const s = io("http://52.73.111.17", {  // server ip address
  })

    setSocket(s) 
    console.log(user) // Debugging 
    cursors = q.getModule('cursors'); // Get current cursor module
    console.log(cursors)  // Debugging 
    cursors.createCursor('cursor', user, randomColorCode); // Create new cursor with paramters given
  
    return() =>{
      s.disconnect() // disconnet the socket when return 
    }
  },[])

 // Save document automatically each 1 second
  useEffect(()=>{
    if (socket == null || quill == null) return // safty check

    const interval = setInterval(()=>{
      socket.emit('save-document', quill.getContents()) // send quill document to the server

    }, SAVE_INTERVAL_MS) // each one second

    return() =>{
      clearInterval(interval)
    }
  },[socket, quill])

// Load document from database
  useEffect(()=>{
    if (socket == null || quill == null) return // safety check

    socket.on("load-document",document=>{ // listen for document from server
      quill.setContents(document) // set quill content to document content
      quill.enable() // enable quill
      }
    )

    socket.emit('get-document', documentId) // send document id to the server to get the document.

  },[socket, quill, documentId])
  
// receive data from server 
  useEffect(()=>{
    if(socket == null || quill == null) return; // safety check
    const handler = (delta) =>{
      console.log(delta) // Debugging
      quill.updateContents(delta) // update quill with delta coming from server
    }
    socket.on('receive-changes',handler ) // listen to changes comming from server 

    return () =>{
      socket.off('receive-changes', handler) // turn socket off on return 
    }
  }, [socket, quill])

  // Send data to server
  useEffect(()=>{
    if(socket == null || quill == null) return;  // safety check
    const handler = (delta, oldDelta, source) =>{
      if (source !== 'user') return; 
      if(!navigator.onLine){ //offline user
        deltaArray.push(delta); // push delta into local array of deltas
        console.log('offline:') // Debugging 
      }
      else{ 
        // online user
        let l = deltaArray.length
        for (let i = 0; i < l ; i++){ 
          socket.emit("send-changes",deltaArray[i]) // send the deltas array
        }
        if (l > 0 ){
          deltaArray = [] // make deltas array empty
          setTimeout(() => {  window.location.reload(false); }, 500); // reload after 500 ms
        }
        setTimeout(() => {  socket.emit("send-changes", delta) }, 0); // send detla to the server
       
      }
    }
    quill.on('text-change',handler ) // on quill text change 

    return () =>{
      quill.off('text-change', handler) // turn off on return 
    }
  }, [socket, quill])

  // Send cursor to server on selection
  useEffect(()=>{
    if(socket == null || quill == null) return; // safety check
    const handler = (range, oldRange, source) =>{
      if (source !== 'user') return; 
      console.log("inside" + delta) // Debugging
      cursors = q.getModule('cursors'); // get cursor module
      console.log(cursors._cursors.cursor) // Debugging
      cursors._cursors.cursor.range = range // set the range of the cursor to the new range
      socket.emit("send-cursor", cursors._cursors.cursor) // send cursor details to the server

 
    }
    quill.on('selection-change',handler ) // on quill selection change 

    return () =>{
      quill.off('selection-change', handler) // turn off on return 
    }
  }, [socket, quill])

  // Send cursor to server on text change
  useEffect(()=>{
    if(socket == null || quill == null) return; 
    const handler = (delta, oldDelta, source) =>{
      if (source !== 'user') return; 
      console.log("inside" + delta) // Debugging
      cursors = q.getModule('cursors'); // Get cursor module
      console.log(cursors._cursors.cursor) // Debugging
      socket.emit("send-cursor", cursors._cursors.cursor) // Send cursor details to the server
    }
    quill.on('text-change',handler ) // on quill text change 

    return () =>{
      quill.off('text-change', handler) // turn off on return 
    }
  }, [socket, quill])

  // Receive cursors 
  useEffect(()=>{
    if(socket == null || quill == null) return; // safety check 
    const handler = (cursors) =>{
      console.log(cursors) // Debugging
      let cr = q.getModule('cursors'); // get cursor module
      cr.createCursor(cursors.name, cursors.name, cursors.color) // create new cursor with paramters given
      cr.moveCursor(cursors.name, cursors.range) // draw cursor in the range given 
    }

    socket.on("receive-cursor",handler)

    return () =>{
      socket.off("receive-cursor", handler)
    }
  }, [socket, quill])

  // Draw my cursor 
  useEffect(() =>{

    q.on('selection-change', selectionChangeHandler(cursors));// on selection change draw my cursor 

  }, [socket, quill])

  // useCallback function take wrapper as parameter 
  // It waits until wrapperRef is defined in the return 
  // statement below. 
  const wrapperRef = useCallback(wrapper=>{
    if (wrapper == null) return // if there is no wrapper return.
    wrapper.innerHTML = ''; // clear the wrapper. 
    const txt = document.createElement('div') // create div element. 
    wrapper.append(txt) // append it to the wrapper.

    /*-------- Quill --------*/
    // create Quill object mapped to txt.
    q = new Quill(txt, {theme:"snow",  modules: { 
      cursors: { 
        hideDelayMs: 500, // delay for label hide
        hideSpeedMs: 0, // speed for label hide 
        transformOnTextChange: true,
      },
      toolbar: TOOLBAR_OPTIONS },
    });

    /* on init */
    q.disable() // disable quill 
    q.setText("Loading...") // set loading... inside the document 
    setQuill(q) // set quill to q 
  },[])


  return (
    // Our text editor! 
    <div id='txt' ref={wrapperRef}></div> 
  );
  
}





function selectionChangeHandler(cursors) {
  const debouncedUpdate = debounce(updateCursor, 500);

  return function(range, oldRange, source) {
    if (source === 'user') {
      // If the user has manually updated their selection, send this change
      // immediately, because a user update is important, and should be
      // sent as soon as possible for a smooth experience.
      updateCursor(range);
    } else {
      // Otherwise, it's a text change update or similar. These changes will
      // automatically get transformed by the receiving client without latency.
      // If we try to keep sending updates, then this will undo the low-latency
      // transformation already performed, which we don't want to do. Instead,
      // add a debounce so that we only send the update once the user has stopped
      // typing, which ensures we send the most up-to-date position (which should
      // hopefully match what the receiving client already thinks is the cursor
      // position anyway).
      debouncedUpdate(range);
    }
  };

  function updateCursor(range) {
    // Use a timeout to simulate a high latency connection.
    setTimeout(() => cursors.moveCursor('cursor', range), CURSOR_LATENCY);
  }
}


function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    const later = function() {
      timeout = null;
      func.apply(context, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}


function timeout(delay) {
  return new Promise( res => setTimeout(res, delay) );
}




// await timeout(1000); 
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
}

const mongoose = require('mongoose')
const Document = require('./Document')
const url = `mongodb+srv://mongo:YVDZQHuIBQckQ7Oz@docsdatabase.rgfffkb.mongodb.net/?retryWrites=true&w=majority
`;
  
// Connection init for mongoDB database
const connectionParams={
    useNewUrlParser: true,
    useUnifiedTopology: true 
}
mongoose.connect(url,connectionParams)
    .then( () => {
        console.log('Connected to the database ')
    })
    .catch( (err) => {
        console.error(`Error connecting to the database. n${err}`);
    })


const defaultValue = ""

// socket setup for server
const io = require('socket.io')(80, {
    cors:{
        origin: 'http://asu-client-v2.s3-website-us-east-1.amazonaws.com',
        methods: ['GET', 'POST']
    },
})

// Start connection
io.on("connection", socket => {

  // Listen for get document
    socket.on("get-document", async documentId => {
      const document = await findOrCreateDocument(documentId) // find or create document
      socket.join(documentId) // join room with document id
      socket.emit("load-document", document.data) // send data to users in the room
      
      // listen on send changes sent by the users and broadcast to other users in the room
      socket.on("send-changes", delta => {
        socket.broadcast.to(documentId).emit("receive-changes", delta)
      })
  
      // listen on save document sent by the users then find and update the document with id
      socket.on("save-document", async data => {
        await Document.findByIdAndUpdate(documentId, { data })
      })

      // listen on send cursor send by the users and broadcast cursor to other users in the room
      socket.on("send-cursor", cursors=>{
        console.log("inside-server")
        socket.broadcast.to(documentId).emit("receive-cursor", cursors)
      })
    })
  })
  

  // called to find or create a new document if not found
  async function findOrCreateDocument(id) {
    if (id == null) return
  
    const document = await Document.findById(id)
    if (document) return document
    return await Document.create({ _id: id, data: defaultValue })
  }
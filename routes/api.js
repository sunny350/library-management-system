const express = require("express");
const User = require("../models/user");
const Book = require("../models/book");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const DeletedBook = require("../models/deletedBooks")

const router = express.Router();


// ........................... Signup Loging Apis ................................................

router.post("/signup", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: "User created" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User Not Found" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass)
      return res.status(400).json({ message: "Invalid Password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

// .................................Books Crud .............................................................

router.post("/books", auth, checkRole(["LIBRARIAN"]), async (req, res) => {
  try {
    const { title, author } = req.body;
    const book = new Book({ title, author });
    await book.save();
    res.status(201).json({ 
      success : true,
      message: "Book added",
    });
    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "Error accured while adding Book", 
      error: error.message 
    });
  }
});

router.get("/books", auth, checkRole(["LIBRARIAN"]), async (req, res) => {
  try {
    const books = await Book.find();
    res.status(201).json({
      success : true,
      message: "All Books",
      data: books
    });
    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "Error accured getting books", 
      error: error.message 
    });
  }
});

router.get("/books/:id", auth, checkRole(["LIBRARIAN", "MEMBER"]), async (req, res) => {
  try {
    const books = await Book.findById(req.params.id);
    res.status(201).json({
      success : true,
      message: "book featched successfully",
      data: books
    });
    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "Error accured getting book data of id " + req.params.id, 
      error: error.message 
    });
  }
});

router.put("/books/:id", auth, checkRole(["LIBRARIAN"]), async (req, res) => {
  try {
    const { title, author } = req.body;
    await Book.findByIdAndUpdate(req.params.id, { title, author });
    res.json({ 
      success : true,
      message: "Book updated" 
    });
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "Boook updation failed", 
      error: error.message 
    });
  }
});

router.delete("/books/:id", auth, checkRole(["LIBRARIAN"]), async (req, res) => {
    try {
      const book = await Book.findById(req.params.id, {_id : 0});
      if(!book) throw new Error("Book not found");
      if(book.status === 'BORROWED') throw new Error("Book already borrowed by someone else") 


      const bookData = book.toObject();
      const deletedBookData = new DeletedBook({...bookData, deletedBy: req.user.id});
      await deletedBookData.save();

      await Book.findByIdAndDelete(req.params.id)

      res.status(200).json({
        success : true,
        message: "Book deleted successfully"
      })
    } catch (error) {
      res.status(500).json({ 
        success : false,
        message: "Error accured while deleting Book", 
        error: error.message 
      });
    }
});


// .................................User crud ............................................................

router.post('/users', auth, checkRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { username, password, role } = req.body;
  
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ 
      success: true,
      message: 'User added' 
    });
    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "unable to add user", 
      error: error.message 
    });
  }
});

router.put('/users/:id', auth, checkRole(['LIBRARIAN']), async (req, res) => {
  try {
    const { username, role } = req.body;
    await User.findByIdAndUpdate(req.params.id, { username, role });
    res.json({ 
      success: true,
      message: 'User updated' 
    });   
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "unable to update user", 
      error: error.message 
    });
  }
});

router.delete('/users/:id', auth, checkRole(['LIBRARIAN']), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { status: 'DELETED', deletedBy : req.user.id});
    res.json({ 
      success: true,
      message: 'User marked as deleted' 
    });    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "unable to delete user", 
      error: error.message 
    });
  }
});

router.delete('/delete-account', auth, checkRole(['MEMBER']), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { status: 'DELETED' });
    res.json({ 
      success: true,
      message: 'Account deleted' 
    });   
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "unable to delete user", 
      error: error.message 
    });
  }
});

router.get('/users', auth, checkRole(['LIBRARIAN']), async (req, res) => {
  try {
    const users = await User.find();
    res.json({
      success: true,
      message: "Users fetched successfully", 
      data : users
    });
    
  } catch (error) {
    res.status(500).json({ 
      success : false,
      message: "unable to fetch user", 
      error: error.message 
    });
  }
});



module.exports = router;

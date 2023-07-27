const express = require("express");
const multer = require("multer");

// Importing Schema / Model
const Post = require("../models/post");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

const MIME_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg'
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const isValid = MIME_TYPE_MAP[file.mimetype];
        let error = new Error("Invalid mime type");

        if (isValid) {
            error = null;
        }

        cb(error, "backend/images");
    },
    filename: (req, file, cb) => {
        const name = file.originalname.toLowerCase().split(' ').join('-');
        const ext = MIME_TYPE_MAP[file.mimetype];

        cb(null, name + '-' + Date.now() + '.' + ext);
    }
});

// Inserting New Post
router.post(
    "",
    checkAuth,
    multer({ storage: storage }).single("image"), 
    (req, res, next) => {
   
    const url = req.protocol + '://' + req.get("host");
    const post = new Post({
        title: req.body.title,
        content: req.body.content,
        imagePath: url + "/images/" + req.file.filename,
        creator: req.userData.userId
    });
    
    post.save().then(createdPost => {
        // Use 201 when adding new data to Database or Something
        res.status(201).json({
            message: "Post added successfully",
            post: {
                id: createdPost._id,
                title: createdPost.title,
                content: createdPost.content,
                imagePath: createdPost.imagePath
            }
        });
    });
});

// Updating Post
router.put(
    "/:id",
    // checkAuth,
    multer({ storage: storage }).single("image"), 
    (req, res, next) => {

    let imagePath = req.body.imagePath;
    if(req.file) {
        const url = req.protocol + '://' + req.get("host");
        imagePath = url + "/images/" + req.file.filename;
    }

    const post = new Post({
        _id: req.body.id,
        title: req.body.title,
        content: req.body.content,
        imagePath: imagePath
    });
    
    Post.updateOne({ _id: req.params.id, creator: req.userData.userId }, post).then(result => {
        res.status(200).json({
            message: "Post updated successfully"
        });
    });
});

// Fetching All Posts
router.get("", (req, res, next) => {
    // Now we can add parameters to paginate via 'req.query' 
    // to fetch posts with pagination like localhost:3000/api/posts?pagesize=2&page=1
    
    const pageSize = +req.query.pagesize;
    const currentPage = req.query.page;
    const postQuery = Post.find();

    let fetchedPosts;

    if (pageSize && currentPage) {
        postQuery
            .skip(pageSize * (currentPage - 1))
            .limit(pageSize);
    }

    postQuery
        .then(documents => {
            fetchedPosts = documents;
            return Post.count()
        })
        .then(count => {
            res.status(200).json({
                message: 'Posts fetched successfully!',
                posts: fetchedPosts,
                maxPosts: count
            });
        });
});

// Fetching Single Post
router.get("/:id", (req, res, next) => {
    Post.findById(req.params.id).then(post => {
        if(post) {
            res.status(200).json({
                message: "Single Post fetched successfully!",
                post: post
            });
        } else {
            res.status(404).json({
                message: 'Post not found!'
            });
        }
    })
});

// Deleting Post
router.delete("/:id", checkAuth, (req, res, next) => {
    Post.deleteOne({ _id: req.params.id }).then(result => {
            console.log(result);
            res.status(200).json({
                message: "Post deleted!"
            });
        });
});

module.exports = router;
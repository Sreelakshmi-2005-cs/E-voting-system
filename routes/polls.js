const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Poll = require('../models/Poll');

// @route   GET /api/polls
// @desc    Get all polls
// @access  Public
router.get('/', async (req, res) => {
    try {
        const polls = await Poll.find().sort({ createdAt: -1 });
        res.json(polls);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/polls
// @desc    Create a poll
// @access  Private
router.post('/', auth, async (req, res) => {
    const { question, options } = req.body;
    try {
        if (!question || !options || options.length < 2) {
            return res.status(400).json({ msg: 'Please provide a question and at least 2 options' });
        }

        const pollOptions = options.map(opt => ({ text: opt, votes: 0 }));

        const newPoll = new Poll({
            question,
            options: pollOptions,
            votedUsers: []
        });

        const poll = await newPoll.save();
        res.json(poll);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/polls/:id/vote
// @desc    Vote on a poll
// @access  Private
router.post('/:id/vote', auth, async (req, res) => {
    try {
        const poll = await Poll.findById(req.params.id);
        if (!poll) return res.status(404).json({ msg: 'Poll not found' });

        // Check if user already voted
        if (poll.votedUsers.includes(req.user.id)) {
            return res.status(400).json({ msg: 'User already voted on this poll' });
        }

        const optionIndex = poll.options.findIndex(opt => opt._id.toString() === req.body.optionId);
        if (optionIndex === -1) {
            return res.status(400).json({ msg: 'Invalid option selected' });
        }

        poll.options[optionIndex].votes += 1;
        poll.votedUsers.push(req.user.id);

        await poll.save();
        res.json(poll);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'Poll not found' });
        res.status(500).send('Server error');
    }
});

module.exports = router;

'use strict';

const express = require('express');
const lowdb = require('lowdb');
const FileAsync = require('lowdb/adapters/FileAsync');
const shortid = require('shortid');

const constants = require('./constants');
const { validateButterfly, validateUser, validateButterflyRating } = require('./validators');

async function createApp(dbPath) {
  const app = express();
  app.use(express.json());

  // TODO-1: Add implementation/third-party modules to enforce the application security and reduce API vulnabilities
  // Sanitize Data
  // Prevent XSS attacks
  // Rate limiting
  // And much more...

  const db = await lowdb(new FileAsync(dbPath));
  await db.read();

  app.get('/', (req, res) => {
    res.json({ message: 'Server is running!' });
  });

  /* ----- BUTTERFLIES ----- */

  /**
   * Get an existing butterfly
   * GET
   */
  app.get('/butterflies/:id', async (req, res) => {
    const butterfly = await db.get('butterflies')
      .find({ id: req.params.id })
      .value();

    if (!butterfly) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(butterfly);
  });

  /**
   * Create a new butterfly
   * POST
   */
  app.post('/butterflies', async (req, res) => {
    try {
      validateButterfly(req.body);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const newButterfly = {
      id: shortid.generate(),
      ...req.body
    };

    await db.get('butterflies')
      .push(newButterfly)
      .write();

    res.json(newButterfly);
  });


  /**
 * Rate a butterfly
 * POST
 */

  // TODO-2: DB schema constraints and validation are needed.
  // TODO-3: Add created_at as db attribute to record date/timestamp a rating is created.
  app.post('/butterflies/:butterflyid/rate', async (req, res) => {
    // TODO-4: Url params validation is needed
    const RATING = ['0','1', '2', '3', '4', '5'];
    try {
      validateButterflyRating(req.body);
      if (!RATING.includes(req.body.rating)){
        throw new Error(); }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Check if the butterfly exists
    const butterfly = await db.get('butterflies')
      .find({ id: req.params.butterflyid })
      .value();

    if (!butterfly) {
      return res.status(404).json({ error: `No butterfly with the id of ${req.params.butterflyid}` });
    }

    // Check if the user exists
    const user = await db.get('users')
      .find({ id: req.body.userid })
      .value();

    if (!user) {
      return res.status(404).json({ error: `No user with the id of ${req.params.userid}` });
    }

    // To avoid duplicate records and make things simpler, we only allow a user to rate each butterfly once.
    // To do that, we created a rating key which is a combination of a string, butterflyid and userid. It is used to track if a
    // user has rated a butterfuly. If rated before, we will return a 400 bad request, otherwise, new record will be saved to the database.
    const butterflyrating = await db.get('butterflyrating')
      .find({ ratingkey: 'key' + req.params.butterflyid + req.body.userid })
      .value();

    try {
      if (butterflyrating){
        throw new Error(); }
    } catch (error) {
      return res.status(400).json({ error: 'You already rated' });
    }

    const newButterflyRating = { id: shortid.generate(), butterflyid: req.params.butterflyid,
      ratingkey: 'key' + req.params.butterflyid + req.body.userid,  ...req.body };
    await db.get('butterflyrating')
      .push(newButterflyRating)
      .write();
    res.json(newButterflyRating);
  });

  /**
 * Retrive a list of user rated butterfly
 * GET
 */
  app.get('/butterflies/getRating/:id', async (req, res) => {
    const rating = await db.get('butterflyrating')
      .filter({ userid: req.params.id })
      .sortBy('rating')
      .value();
    if (!rating) {
      return res.status(404).json({ error: 'Not found' });
    }

    const butterflies = [];
    if (rating) {
      for (const x of rating) {
        const obj = JSON.parse(JSON.stringify(x));
        const butterfly = await db.get('butterflies')
          .find({ id: obj.butterflyid })
          .value();
        butterflies.push(butterfly);
      }
    }
    res.json(butterflies);
  });


  /**
   * Delete all ratings
   */
  app.delete('/butterflyrating', async (req, res) => {
    await db.get('butterflyrating').remove({}).write();
    res.send('Deleted!');
  });

  /* ----- USERS ----- */

  /**
   * Get an existing user
   * GET
   */
  app.get('/users/:id', async (req, res) => {
    const user = await db.get('users')
      .find({ id: req.params.id })
      .value();

    if (!user) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(user);
  });

  /**
   * Create a new user
   * POST
   */
  app.post('/users', async (req, res) => {
    try {
      validateUser(req.body);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const newUser = {
      id: shortid.generate(),
      ...req.body
    };

    await db.get('users')
      .push(newUser)
      .write();

    res.json(newUser);
  });

  return app;
}

/* istanbul ignore if */
if (require.main === module) {
  (async () => {
    const app = await createApp(constants.DB_PATH);
    const port = process.env.PORT || 8000;

    app.listen(port, () => {
      console.log(`Butterfly API started at http://localhost:${port}`);
    });
  })();
}

module.exports = createApp;

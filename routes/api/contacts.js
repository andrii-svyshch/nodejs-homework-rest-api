const express = require("express");
const createError = require("http-errors");
const { Types } = require("mongoose");
const { Contact, schemas } = require("../../models/contact");
const { authenticate } = require("../../middlewares");

const router = express.Router();

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, favorite } = req.query;
    if (isNaN(page) || isNaN(limit)) {
      throw new createError(400, "Page or limits not a number");
    }
    const skip = (page - 1) * limit;
    const { _id } = req.user;
    const query = favorite ? { owner: _id, favorite } : { owner: _id };
    const result = await Contact.find(query, "-createdAt -updatedAt", {
      skip,
      limit: +limit,
    }).populate("owner", "email");
    if (!result) {
      const error = new Error("Not found");
      error.status = 404;
      throw error;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      throw new createError(400, "invalid ID");
    }
    const result = await Contact.find(
      { _id: id, owner: req.user._id },
      "-createdAt -updatedAt"
    );
    if (!result) {
      throw new createError(404, "Not found");
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, async (req, res, next) => {
  try {
    const { error } = schemas.add.validate(req.body);
    if (error) {
      throw new createError(400, "missing required name field");
    }
    const data = { ...req.body, owner: req.user._id };
    const result = await Contact.create(data);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      throw new createError(400, "invalid ID");
    }

    const result = await Contact.findOneAndRemove({
      _id: id,
      owner: req.user._id,
    });
    if (!result) {
      throw new createError(404, "Not found");
    }
    res.json({ message: "contact deleted" });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", authenticate, async (req, res, next) => {
  try {
    const { error } = schemas.add.validate(req.body);

    if (error) {
      throw new createError(400, error.message);
    }
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      throw new createError(400, "invalid ID");
    }
    const result = await Contact.findOneAndUpdate(
      {
        _id: id,
        owner: req.user._id,
      },
      req.body,
      {
        new: true,
        select: "-createdAt -updatedAt",
      }
    ).populate("owner", "email");
    if (!result) {
      throw new createError(404, "Not found");
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/favorite", authenticate, async (req, res, next) => {
  try {
    const { error } = schemas.updateFavorite.validate(req.body);
    if (error) {
      throw new createError(400, "missing field favorite");
    }
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      throw new createError(400, "invalid ID");
    }
    const result = await Contact.findOneAndUpdate(
      {
        _id: id,
        owner: req.user._id,
      },
      req.body,
      {
        new: true,
        select: "-createdAt -updatedAt",
      }
    ).populate("owner", "email");
    if (!result) {
      throw new createError(404, "Not found");
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

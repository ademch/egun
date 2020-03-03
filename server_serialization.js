const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');

mongoose.connect("mongodb+srv://admin:"+ process.env.MONGODB_PWD + "@caracalcluster-0rexl.mongodb.net/test?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true})

mongoose.set('bufferCommands', false);

const egunSchema = new mongoose.Schema({
    _id  : mongoose.Schema.Types.ObjectId,
    name : { type: String, required: true },
    CathodeParams: {
        CathR                : Number,
        CathFocusR           : Number,
        SFBeamHalfAngle      : Number,
        SFFocusX             : Number, 
        SFFocusY             : Number, 
        CathSkirtR           : Number,
        CathSkirtH           : Number,
        CathSkirtA           : Number},
    AnodeParams: {
        AnodeCathGap         : Number,
        AnodeInnerR          : Number,
        AnodeRadialGap       : Number,
        AnodeSaddleH         : Number,
        AnodeCurvH           : Number,
        AnodeNozzleR         : Number,
        AnodeNozzleH         : Number,
        AnodeNozzleThroatR   : Number,
        AnodeNozzleThroatH   : Number,
        AnodeNozzleDiffusorR : Number,
        AnodeNozzleDiffusorH : Number},
    PlasmaParams: {
        CathDarkSpace        : Number,
        AccelerationVoltage  : Number,
        SpaceCharge          : Number,
        StartingEnergy       : Number},
    Lens1Params: {
        Lens1DistToGun       : Number,
        Lens1InnerR          : Number,
        Lens1Thickness       : Number,
        Lens1Height          : Number,
        Lens1TotCurrent      : Number,
        Lens1CoreThickness   : Number },
    Lens2Params: {
        Lens2DistToGun       : Number,
        Lens2InnerR          : Number,
        Lens2Thickness       : Number,
        Lens2Height          : Number,
        Lens2TotCurrent      : Number,
        Lens2CoreThickness   : Number }
    }
);

Gun = mongoose.model('eGun', egunSchema);

router.post("/add", (req, res) => {
    
    const gun = new Gun({
        _id:           new mongoose.Types.ObjectId(),
        name:          req.body.name,
        CathodeParams: req.body.CathodeParams,
        AnodeParams:   req.body.AnodeParams,
        PlasmaParams:  req.body.PlasmaParams,
        Lens1Params:   req.body.Lens1Params,
        Lens2Params:   req.body.Lens2Params
    });

    gun.save(err => {
        if (err)
        {   console.log(err);
            res.status(500).json({message: err});
        }
        else
            res.status(200).json({message: 'Added', id: gun.id});
    });

});


router.patch("/update/:id", (req, res) => {
    const id = req.params.id;
    
    var updateOps = {};

    for (var ops in req.body) {
        updateOps[ops] = req.body[ops];
    }
    
    Gun.updateOne( { _id: id }, { $set: updateOps })
    .exec()
    .then(data => {
        console.log(data);
        res.status(200).json({message: 'Updated', id: id});
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });
});

router.delete("/delete/:id", (req, res) => {
    const id = req.params.id;
    Gun.findByIdAndDelete(id)
    .exec()
    .then(items => {
        console.log(items);
        res.status(200).json({message: 'Removed', id: id});
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });

});

router.get("/queryall", (req, res) => {
    Gun.find()
    .exec()
    .then(items => {
        console.log(items);
        res.status(200).json(items);
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });
    
});

router.get("/query/:id", (req, res) => {
    const id = req.params.id;
    Gun.findById(id)
    .exec()
    .then(items => {
        console.log(items);
        res.status(200).json(items);
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });
    
});


module.exports = router;
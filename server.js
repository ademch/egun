const express = require("express");
// const path = require("path");
// var multer = require("multer");
// const cors = require("cors");
var bodyParser = require("body-parser");
// var parseSTL = require('parse-stl');
// var ffi = require('ffi');
var fs = require('fs');
var readline = require('readline');
var assert = require('assert');
var srv_state = require('./server_state');
var VecMath = require('./VecMath');
var FieldW = require('./FieldWorker');

var child_process = require('child_process');

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
}

const SF_PathAutomesh  = "C:\\LANL\\AUTOMESH.EXE";
const SF_PathPoisson   = 'C:\\LANL\\POISSON.EXE';
const SF_WSPlot        = 'C:\\LANL\\WSFPLOT.EXE';
const SF_SF7           = 'C:\\LANL\\SF7.EXE';
const SendKeys         = '.\\BashScripts\\SendKeys.bat';
const Tmt              = '.\\BashScripts\\tmt.bat';
const SF_Title         = '"WSFPplot 7.17 --- Poisson Superfish Plotting Program     File 1.T35"';
const SF_TitleProp     = '"Bit Image File Output (PCX/BMP/PNG format)"';
const SF_ES_SourcePath = 'C:\\LANL\\Examples\\Electrostatic\\Try\\1.am';
const SF_MS_SourcePath = 'C:\\LANL\\Examples\\Magnetostatic\\Try\\1.am';
const SF_DS_SourcePath = 'C:\\LANL\\Examples\\Magnetostatic\\Deflection\\1.am';
const SF_DS2_SourcePath = 'C:\\LANL\\Examples\\Magnetostatic\\Deflection2\\1.am';
const SF_ES_t35Path    = 'C:\\LANL\\Examples\\Electrostatic\\Try\\1.T35';
const SF_MS_t35Path    = 'C:\\LANL\\Examples\\Magnetostatic\\Try\\1.T35';
const SF_DS_t35Path    = 'C:\\LANL\\Examples\\Magnetostatic\\Deflection\\1.T35';
const SF_DS2_t35Path   = 'C:\\LANL\\Examples\\Magnetostatic\\Deflection2\\1.T35';

var ResultImagePath;

var fileLog1;
var fileLog2;


var SuperfishParams;
var CathodeParams;
var AnodeParams;
var PlasmaParams;
var Lens1Params;
var Lens2Params;
var DeflCoilParams;

const canvas_w = 1700;		// 1500 + margins
const canvas_h = 6270;		// 4500 + margins - [image alignment shift]

const { createCanvas, loadImage } = require('canvas')
const canvas = createCanvas(canvas_w, canvas_h)
const ctx = canvas.getContext('2d')
const { Image } = require('image-js');

var ServerState = srv_state.ServerEnum.ONLINE;
var ProblemType = srv_state.ProblemType;

var app = express();
//app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.text());
//app.use(express.json());
app.use(express.static(__dirname));
//app.use(express.urlencoded());

ODMroutes = require('./server_serialization.js');

app.use("/ODM", ODMroutes);
  
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


app.get("/image", (req, res) => {
    if (ResultImagePath) {

        var type = 'image/png';
        var s = fs.createReadStream(ResultImagePath);
        s.on('open', function () {
            res.set('Content-Type', type);
            s.pipe(res);
        });
        s.on('error', function () {
            res.set('Content-Type', 'text/plain');
            res.status(404).end('Not found');
        });
    }
});


app.get('/status', (req, res) => {
	// SSE Setup
	res.writeHead(200, {
		'Content-Type' : 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection'   : 'keep-alive',
	});
	setInterval(() => { if (!res.finished) res.write('data:' + JSON.stringify({state: ServerState}) + '\n\n');
	                  }, 1000);
});


app.post("/calculate", (req, res) => {

	ServerState = srv_state.ServerEnum.STARTING;

	// SFFocusX, SFFocusY		    // x,y coords of beam focus in cm
	// SFBeamHalfAngle;		    	// beam half angle in rad
	// CathFocusR;			    	// cathode focus radius in cm
	// AutofishScript;			  	// script file for SuperFish
	// CathDarkSpace;		    	// distance of dark space in cm

	SuperfishParams = req.body.SuperfishParams;
	CathodeParams   = req.body.CathodeParams;
	AnodeParams     = req.body.AnodeParams;
    PlasmaParams    = req.body.PlasmaParams;
    Lens1Params     = req.body.Lens1Params;
    Lens2Params     = req.body.Lens2Params;
	DeflCoilParams  = req.body.DeflCoilParams;

	Object.assign(FieldW.DeflCoilParams, DeflCoilParams);
	
	//FieldW.DeflCoilParams.DeflAbsPosY = DeflCoilParams.DeflAbsPosY;

	// ----------------------
	// Electrostatic: 7.5cm x 15cm zone
	FieldW.Dim.EFx_IntervNumber = parseFloat(SuperfishParams.SFIntGran);
	FieldW.Dim.EFx_IntervBoundN = FieldW.Dim.EFx_IntervNumber + 1;
    FieldW.Dim.EFx_IntervLength = 7.5/FieldW.Dim.EFx_IntervNumber;	// mm
    
    FieldW.Dim.EFy_IntervNumber = parseFloat(SuperfishParams.SFIntGran)*2;
	FieldW.Dim.EFy_IntervBoundN = FieldW.Dim.EFy_IntervNumber + 1;
	FieldW.Dim.EFy_IntervLength = 15.0/FieldW.Dim.EFy_IntervNumber;	// mm

	// Magnetostatic: 7.5cm x 60cm zone
	FieldW.Dim.MFx_IntervNumber = parseFloat(SuperfishParams.SFIntGran);
	FieldW.Dim.MFx_IntervBoundN = FieldW.Dim.MFx_IntervNumber + 1;
	FieldW.Dim.MFx_IntervLength = 7.5/FieldW.Dim.MFx_IntervNumber;	// mm

	FieldW.Dim.MFy_IntervNumber = parseFloat(SuperfishParams.SFIntGran)*8;	//  <---
	FieldW.Dim.MFy_IntervBoundN = FieldW.Dim.MFy_IntervNumber + 1;
	FieldW.Dim.MFy_IntervLength = 60.0/FieldW.Dim.MFy_IntervNumber;	// mm
    // ----------------------
	// Deflection: 15cm x 15cm zone
	FieldW.Dim.DFx_IntervNumber = parseFloat(SuperfishParams.SFIntGran)*2;
	FieldW.Dim.DFx_IntervBoundN = FieldW.Dim.DFx_IntervNumber + 1;
    FieldW.Dim.DFx_IntervLength = 15.0/FieldW.Dim.DFx_IntervNumber;	// mm
    
    FieldW.Dim.DFy_IntervNumber = parseFloat(SuperfishParams.SFIntGran)*2;
	FieldW.Dim.DFy_IntervBoundN = FieldW.Dim.DFy_IntervNumber + 1;
    FieldW.Dim.DFy_IntervLength = 15.0/FieldW.Dim.DFy_IntervNumber;	// mm
    
    // ----------------------
	// Deflection2: 15cm x 15cm zone
	FieldW.Dim.DF2x_IntervNumber = parseFloat(SuperfishParams.SFIntGran)*2;
	FieldW.Dim.DF2x_IntervBoundN = FieldW.Dim.DF2x_IntervNumber + 1;
    FieldW.Dim.DF2x_IntervLength = 15.0/FieldW.Dim.DF2x_IntervNumber; // mm
    
    FieldW.Dim.DF2y_IntervNumber = parseFloat(SuperfishParams.SFIntGran)*2;
	FieldW.Dim.DF2y_IntervBoundN = FieldW.Dim.DF2y_IntervNumber + 1;
	FieldW.Dim.DF2y_IntervLength = 15.0/FieldW.Dim.DF2y_IntervNumber; // mm

	var AutofishES_Source  = SuperfishParams.AutofishES.replace(/\n/g, "\r\n");
	var AutofishMS_Source  = SuperfishParams.AutofishMS.replace(/\n/g, "\r\n");
	var AutofishDS_Source  = SuperfishParams.AutofishDS.replace(/\n/g, "\r\n");
	var AutofishDS2_Source = SuperfishParams.AutofishDS2.replace(/\n/g, "\r\n");

    setImmediate(() => {
		if (SuperfishParams.CalcESField)
			fs.writeFileSync(SF_ES_SourcePath, AutofishES_Source);
		if (SuperfishParams.CalcMSField)
			fs.writeFileSync(SF_MS_SourcePath, AutofishMS_Source);
        if (SuperfishParams.CalcDSField)
			fs.writeFileSync(SF_DS_SourcePath, AutofishDS_Source);
        if (SuperfishParams.CalcDS2Field)
			fs.writeFileSync(SF_DS2_SourcePath, AutofishDS2_Source);

		StartSuperFish();
	});

    return res.send({
      success: true });
});


app.listen(3000, "0.0.0.0", () => console.log("Running at Port 3000"));

var ParticleEnum = {
    ELECTRON  : 0,
    AR_ION    : 1,
    H2_ION    : 2,
    NE_ION    : 3,
}


function ReadFieldValues(p_type, path_to_file, aF_values)
{
	return new Promise(function(resolve,reject) {

		aF_values.length = 0;
	
		console.log('Reading Field values...');
		
		var bStartFound = false;
        var strMatch;
        
        if (p_type == ProblemType.ES)
			strMatch = "    (cm)          (cm)           (V/cm)        (V/cm)        (V/cm)         (V)  ";
		if (p_type == ProblemType.MS)
			strMatch = "    (cm)          (cm)             (G)           (G)           (G)         (G-cm)        (G/cm)        (G/cm)        Index";
        if (p_type == ProblemType.DS)
            strMatch = "    (cm)          (cm)             (G)           (G)           (G)         (G-cm)        (G/cm)        (G/cm)        (G/cm)";
        if (p_type == ProblemType.DS2)
            strMatch = "    (cm)          (cm)             (G)           (G)           (G)         (G-cm)        (G/cm)        (G/cm)        (G/cm)";
        
		var path = path_to_file.substr(0, path_to_file.lastIndexOf("\\") + 1);
		var rd = readline.createInterface({
			input: fs.createReadStream(path + 'OUTSF7.TXT'),
			terminal: false
		});

		rd.on('line', function(line) {
			if (!bStartFound)
			{	if (line.indexOf(strMatch) >= 0)
					bStartFound = true; 
				return;
			}

			var aPoint = line.trim().split(/\s+/);
			aF_values.push(aPoint.map(parseFloat).slice(2,4)); // get E(or B)x, E(or B)y only
		});

		rd.on('close', () => {
			console.log("Read " + aF_values.length + " items");
            if (p_type == ProblemType.DS2)
    			ServerState = srv_state.ServerEnum.EFRead;
			resolve();
		});
	});
}

// Calculates electron velocity taking field strength and the current speed
//                cm cm cm  m/s        descriptor
// returns                  m/s
function dvdtFunc(vPos,     VelPrev,   Particle)
{
	Vc_2  = 89875.517e12;	// m/s
    
    switch (Particle) {
        case ParticleEnum.ELECTRON:
            Qe    =-1.60217662e-19;	// coul
            Me    = 9.10938356e-31;	// kg
            break;
        case ParticleEnum.AR_ION:
            Qe    = 1.60217662e-19;	// coul
            Me    = 6.697048E-26;	// kg
        break;
        case ParticleEnum.NE_ION:
            Qe    = 1.60217662e-19;	// coul
            Me    = 3.348342E-26;	// kg
        break;
        case ParticleEnum.H2_ION:
            Qe    = 1.60217662e-19;	// coul
            Me    = 3.346155E-27;	// kg
        break;
    }

    Qe_Me = Qe/Me;

    //Me=3.32e-24;	//H2 molecule
    
    // sample fields in the current point
	var E   = FieldW.PeekElectrField(vPos);        // V/m
    var Bm  = FieldW.PeekMagnField(vPos);          // T
    var Bd  = FieldW.PeekDeflectionField(vPos);    // T
    var Bd2 = FieldW.PeekDeflectionField2(vPos);   // T

    var B = VecMath.VectorAdd(Bm, Bd);
        B = VecMath.VectorAdd(B, Bd2);

	var VPrevSqr = VecMath.VectorDot(VelPrev, VelPrev);
	LorentzContraction = Math.pow( 1.0-(VPrevSqr)/Vc_2, 1.5 );

	var VxB = VecMath.VectorCross(VelPrev, B);

	Aspeed = LorentzContraction * Qe/Me*( E[0] + VxB[0] );
	Bspeed = LorentzContraction * Qe/Me*( E[1] + VxB[1] );
	Cspeed = LorentzContraction * Qe/Me*( E[2] + VxB[2] );

	return [Aspeed, Bspeed, Cspeed];	// m/s
}

function drdtFunc(vel)
{
	return vel;
}


// Calculates electron velocity taking field strength in a current position and the current speed
//            cm cm cm  m/s    s    descriptor
function Vxyz(vPos,     vVel,  dt,  Particle)
{
    // Haines equation for differential equation:
	// un+1 = un + 0.5(k1 + k2)dt
	// kr1 = f( vel(tn) )         at the current time we are in a point x(tn) moving with vel(tn)
	// kv1 = f( r(tn), vel(tn) )  at the current time we are in a point x(tn) moving with vel(tn)
	// kr2 = f( vel(tn) + dt*kv1 )                 peek next point
	// kv2 = f( r(tn) + dt*kr1, vel(tn) + dt*kv1 ) peek next point
	
	var kr1 = drdtFunc(vVel);                          // velocity at the current point
	var kv1 = dvdtFunc(vPos, vVel, Particle);		   // acceleration at the current point

	// m/s -> cm/s results in *100
	var vPosNext = VecMath.VectorAdd( vPos, VecMath.VectorMult(dt*100.0, kr1) );
    var vVelNext = VecMath.VectorAdd( vVel, VecMath.VectorMult(dt, kv1));

	var kr2 = drdtFunc(vVelNext);                      // velocity at the next point
    var kv2 = dvdtFunc(vPosNext, vVelNext, Particle);  // acceleration at the next point

	// m/s -> cm/s results in *100
    var r = VecMath.VectorAdd(vPos, VecMath.VectorMult(dt*0.5*100.0, VecMath.VectorAdd(kr1, kr2)));
    var v = VecMath.VectorAdd(vVel, VecMath.VectorMult(dt*0.5,       VecMath.VectorAdd(kv1, kv2)));

	vPos.length = 0;
	vPos.push(...r);

	vVel.length = 0;
	vVel.push(...v);
}


function EmitElectrons()
{
const fShort = 0.02;	// cm

	// for (var i = 0; i < 41; i++) {
	// 	var xp = CathodeParams.SFFocusX + (CathodeParams.CathFocusR-fShort)*Math.cos(Math.PI/2.0 - CathodeParams.SFBeamHalfAngle + i*CathodeParams.SFBeamHalfAngle/20);
	// 	var yp = CathodeParams.SFFocusY + (CathodeParams.CathFocusR-fShort)*Math.sin(Math.PI/2.0 - CathodeParams.SFBeamHalfAngle + i*CathodeParams.SFBeamHalfAngle/20);

    //     ctx.fillStyle = "DarkTurquoise";
    //     TraceElectronTrajectory(xp, yp, 0);
    // }


    for (var i = 0; i < 30; i++) {
		var xpR = CathodeParams.SFFocusX + (CathodeParams.CathFocusR-fShort)*Math.cos(Math.PI/2.0 + CathodeParams.SFBeamHalfAngle - CathodeParams.SFBeamHalfAngle*0.1);
		var yp  = CathodeParams.SFFocusY + (CathodeParams.CathFocusR-fShort)*Math.sin(Math.PI/2.0 + CathodeParams.SFBeamHalfAngle - CathodeParams.SFBeamHalfAngle*0.1);

        var xp = CathodeParams.SFFocusX + (xpR-7.5)*Math.cos(2.0*Math.PI*i/30);
        var zp =                          (xpR-7.5)*Math.sin(2.0*Math.PI*i/30);

        ctx.fillStyle = "DarkTurquoise";
        TraceParticleTrajectory(xp, yp, zp,  ParticleEnum.ELECTRON);
    }

    for (var i = 0; i < 30; i++) {
		var xpR = CathodeParams.SFFocusX + (CathodeParams.CathFocusR-fShort)*Math.cos(Math.PI/2.0 + CathodeParams.SFBeamHalfAngle - CathodeParams.SFBeamHalfAngle*0.5);
		var yp  = CathodeParams.SFFocusY + (CathodeParams.CathFocusR-fShort)*Math.sin(Math.PI/2.0 + CathodeParams.SFBeamHalfAngle - CathodeParams.SFBeamHalfAngle*0.5);

        var xp = CathodeParams.SFFocusX + (xpR-7.5)*Math.cos(2.0*Math.PI*i/30);
        var zp =                          (xpR-7.5)*Math.sin(2.0*Math.PI*i/30);

         ctx.fillStyle = "PaleGreen";
        TraceParticleTrajectory(xp, yp, zp,  ParticleEnum.ELECTRON);
    }

    for (var i = 0; i < 30; i++) {
		var xpR = CathodeParams.SFFocusX + (CathodeParams.CathFocusR-fShort)*Math.cos(Math.PI/2.0 + CathodeParams.SFBeamHalfAngle - CathodeParams.SFBeamHalfAngle*0.8);
		var yp  = CathodeParams.SFFocusY + (CathodeParams.CathFocusR-fShort)*Math.sin(Math.PI/2.0 + CathodeParams.SFBeamHalfAngle - CathodeParams.SFBeamHalfAngle*0.8);

        var xp = CathodeParams.SFFocusX + (xpR-7.5)*Math.cos(2.0*Math.PI*i/30);
        var zp =                          (xpR-7.5)*Math.sin(2.0*Math.PI*i/30);

         ctx.fillStyle = "OrangeRed";
        TraceParticleTrajectory(xp, yp, zp,  ParticleEnum.ELECTRON);
    }

    // for (var i = 0; i < 30; i++) {
    //     var xp = CathodeParams.SFFocusX + 1.82*Math.cos(2.0*Math.PI*i/30);
    //     var zp =                          1.82*Math.sin(2.0*Math.PI*i/30);
	// 	var yp = 10.6;

    //     ctx.fillStyle = "DarkTurquoise";
    //     TraceElectronTrajectory(xp, yp, zp);
    // }

    // for (var i = 0; i < 30; i++) {
    //     var xp = CathodeParams.SFFocusX + 0.82*Math.cos(2.0*Math.PI*i/30);
    //     var zp =                          0.82*Math.sin(2.0*Math.PI*i/30);
	// 	var yp = 11;

    //     ctx.fillStyle = "PaleGreen";
    //     TraceElectronTrajectory(xp, yp, zp);
    // }

    // for (var i = 0; i < 10; i++) {
    //     var xp = CathodeParams.SFFocusX + 0.3*Math.cos(2.0*Math.PI*i/10);
    //     var zp =                          0.3*Math.sin(2.0*Math.PI*i/10);
	// 	var yp = 11.07;

    //     ctx.fillStyle = "OrangeRed";
    //     TraceElectronTrajectory(xp, yp, zp);
    // }
}


function EmitIons()
{
const fShort = 0.022;	// cm


    for (var i = 0; i < 30; i++) {
		var yp  = CathodeParams.SFFocusY + CathodeParams.CathFocusR - PlasmaParams.CathDarkSpace + 0.6;

        var xp = CathodeParams.SFFocusX + (AnodeParams.AnodeNozzleR/10.0 + 0.2)*Math.cos(2.0*Math.PI*i/30);
        var zp =                          (AnodeParams.AnodeNozzleR/10.0 + 0.2)*Math.sin(2.0*Math.PI*i/30);

        ctx.fillStyle = "DarkTurquoise";
        TraceParticleTrajectory(xp, yp, zp,  ParticleEnum.AR_ION);
    }

    
    for (var i = 0; i < 30; i++) {
		var yp  = CathodeParams.SFFocusY + CathodeParams.CathFocusR - PlasmaParams.CathDarkSpace + 0.4;

        var xp = CathodeParams.SFFocusX + (AnodeParams.AnodeNozzleR/10.0 - 1.0)*Math.cos(2.0*Math.PI*i/30);
        var zp =                          (AnodeParams.AnodeNozzleR/10.0 - 1.0)*Math.sin(2.0*Math.PI*i/30);

        ctx.fillStyle = "PaleGreen";
        TraceParticleTrajectory(xp, yp, zp,  ParticleEnum.AR_ION);
    }


    for (var i = 0; i < 30; i++) {
		var yp  = CathodeParams.SFFocusY + CathodeParams.CathFocusR - PlasmaParams.CathDarkSpace + 0.3;

        var xp = CathodeParams.SFFocusX + (AnodeParams.AnodeNozzleR/10.0 - 1.6)*Math.cos(2.0*Math.PI*i/30);
        var zp =                          (AnodeParams.AnodeNozzleR/10.0 - 1.6)*Math.sin(2.0*Math.PI*i/30);

        ctx.fillStyle = "OrangeRed";
        TraceParticleTrajectory(xp, yp, zp,  ParticleEnum.AR_ION);
    }

}



// x,y,z- cm
function TraceParticleTrajectory(x,y,z, Particle)
{
var vVel = [0.0, 0.0, 0.0];
var aVelXYZ;

if (Particle === ParticleEnum.ELECTRON)
{
	vInitVel = VecMath.VectorSub([CathodeParams.SFFocusX, CathodeParams.SFFocusY, 0], [x,y,z]);
	vInitVel = VecMath.VectorNormalize(vInitVel);

	const Qe    =-1.60217662e-19;	// coul
	const Me    = 9.10938356e-31;	// kg

	vMag = Math.sqrt(2.0*Qe/Me*-PlasmaParams.StartingEnergy);
	vVel = VecMath.VectorMult(vMag, vInitVel);
}

var vPos = [x,y,z];     // cm
var dt = (Particle === ParticleEnum.ELECTRON) ? 1e-12 : 1e-9;   // 1e-11 gave poor results for deflection coil
const Vc=299.7915942e6;	// m/s


	for (let i=0; i<120000; i++)
	{
		if (Math.sqrt(VecMath.sqr(vPos[0] - 7.5) + VecMath.sqr(vPos[2])) > 7.5) break;
		if ((vPos[1] < -45) || (vPos[1] >= 15.0)) break;

        if (Particle !== ParticleEnum.ELECTRON)
        if (Math.sqrt( VecMath.sqr(vPos[0] - CathodeParams.SFFocusX) + 
                       VecMath.sqr(vPos[1] - CathodeParams.SFFocusY) +
                       VecMath.sqr(vPos[2] - 0)
                       ) > CathodeParams.CathFocusR) break;

        // draw electron position
		var pt_x = vPos[0]*100.0 + 100;
		var pt_y = 1600 - vPos[1]*100.0;
        ctx.fillRect(pt_x, pt_y, 2,2);

        if (vPos[0] === NaN)
            console.log("")

		// calculate new velocity vector
        Vxyz(vPos, vVel, dt, Particle);

        // var Beta = VecMath.VectorLength(aVelXYZ)/Vc;
        // var ptG_x = Beta*200000.0 + 1100;
		// var ptG_y = 1600 - vPos[1]*100.0;
        // ctx.fillRect(ptG_x, ptG_y, 50,50);
        
		// console.log("x: " + fPosX.toPrecision(4) + ", y:" + fPosY.toPrecision(4) + ", z:" + fPosZ.toPrecision(4) + "\n");
	    // console.log("  Ex: " + aElField[0].toPrecision(8) + ", Ey:" + aElField[1].toPrecision(8) + ", Ez:" + aElField[2].toPrecision(8) + "\n");
        // console.log("  Ckx: " +aVelXYZ[0].toPrecision(4) + ", Cky:" + aVelXYZ[1].toPrecision(4) + ", Ckz:" + aVelXYZ[2].toPrecision(4) + "\n");
        // console.log("  Beta:" + (VecMath.VectorLength(aVelXYZ)/Vc).toPrecision(4) + "\n");

		// fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "x: " + fPosX.toPrecision(4) + ", y:" + fPosY.toPrecision(4) + ", z:" + fPosZ.toPrecision(4) + "\n");
	    // fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "  Ex: " + aElField[0].toPrecision(8) + ", Ey:" + aElField[1].toPrecision(8) + ", Ez:" + aElField[2].toPrecision(8) + "\n");
        // fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "  Ckx: " +aVelXYZ[0].toPrecision(4) + ", Cky:" + aVelXYZ[1].toPrecision(4) + ", Ckz:" + aVelXYZ[2].toPrecision(4) + "\n");
        // fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "  Ck:" + Math.sqrt(aVelXYZ[0]*aVelXYZ[0] + aVelXYZ[1]*aVelXYZ[1] + aVelXYZ[2]*aVelXYZ[2]).toPrecision(4) + "\n");
        // fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "  V:" + Math.sqrt(fOldVelX*fOldVelX + fOldVelZ*fOldVelZ) + "\n");
	}
}



function DrawFieldValues(ES_problem, path_to_file, result_ind)
{
	return new Promise(function(resolve,reject) {

        // clear canvas once
        if (ES_problem) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'multiply';
        }
        
        // find the last field image (even if we do not intend to draw them)
        var path = path_to_file.substr(0, path_to_file.lastIndexOf("\\") + 1);
        assert(fs.existsSync(path + '101.png'));
        var ind;
        for (ind = 500; ind>100; ind--) {
            if (fs.existsSync(path + ind +'.png')) break;
        }

        result_ind.push(ind);

        if (!SuperfishParams.PlotFields) {resolve(result_ind); return;}

        console.log("Drawing field isolines");

        if ((ES_problem)  && (!SuperfishParams.CalcESField)) {resolve(result_ind); return;}
        if ((!ES_problem) && (!SuperfishParams.CalcMSField)) {resolve(result_ind); return;}


        // PromiseES = Image.load(pathES + filenameES_IN + '.png')
        // .then(value => { ImageGrey = value.grey(); return ImageGrey.save(pathES + filenameES_IN + '_gs.png');})
        // .then( () => { return loadImage(pathES + filenameES_IN + '_gs.png');} );
    
        loadImage(path + ind + '.png')
        .then( (image) => {
            
            if (ES_problem) //       sx sy  sw  sh    dx  dy  dw  dh
                ctx.drawImage(image, 53,98, 790,1560, 851,97, 790,1560);
            else
                ctx.drawImage(image, 103,398, 750,6230, 851,97, 750,6230);
            
            resolve(result_ind);
            }
        );

	});
}


// function takes two recent images of ES and MS problems
// draws them to the result image, adds electron traces and params
function DrawElectronMap(aInd)
{

    if (SuperfishParams.TraceElectron) {
        console.log("Tracing electrons");
        EmitElectrons();
    }
    else {
        console.log("Tracing ions");
        EmitIons();
    }

    DrawParamsOnTheImage();
    
    assert(Array.isArray(aInd));
    var pathES = SF_ES_SourcePath.substr(0, SF_ES_SourcePath.lastIndexOf("\\") + 1);
    ResultImagePath = pathES + 'ESMS_' + aInd[0] + '_' +  aInd[1] + '.png'; // save to global var

    var dataBuffer = canvas.toBuffer();
    fs.writeFileSync(ResultImagePath, dataBuffer);

    ServerState = srv_state.ServerEnum.Electron;

    console.log("done");
    console.log("");
}

function DrawParamsOnTheImage()
{
	ctx.fillStyle = "Black";

	var iYcoord = 3000;

	ctx.font = '62px "Comic Sans"';
	ctx.fillText('Cathode Params', 120, iYcoord);
	iYcoord += 70;

	ctx.font = '54px "Comic Sans"';
	for(var propertyName in CathodeParams) {
		ctx.fillText(propertyName + " " + CathodeParams[propertyName], 120, iYcoord);
		iYcoord += 54;
	}

	iYcoord += 70;
	ctx.font = '62px "Comic Sans"';
	ctx.fillText('Anode Params', 120, iYcoord);
	iYcoord += 70;

	ctx.font = '54px "Comic Sans"';
	for(var propertyName in AnodeParams) {
		ctx.fillText(propertyName + " " + AnodeParams[propertyName], 120, iYcoord);
		iYcoord += 54;
	}

	iYcoord += 70;
	ctx.font = '62px "Comic Sans"';
	ctx.fillText('Plasma Params', 120, iYcoord);
	iYcoord += 70;

	ctx.font = '54px "Comic Sans"';
	for(var propertyName in PlasmaParams) {
		ctx.fillText(propertyName + " " + PlasmaParams[propertyName], 120, iYcoord);
		iYcoord += 54;
    }
    
    iYcoord += 70;
	ctx.font = '62px "Comic Sans"';
	ctx.fillText('Focusing Lens #1', 120, iYcoord);
	iYcoord += 70;

	ctx.font = '54px "Comic Sans"';
	for(var propertyName in Lens1Params) {
		ctx.fillText(propertyName + " " + Lens1Params[propertyName], 120, iYcoord);
		iYcoord += 54;
    }
    
    iYcoord += 70;
	ctx.font = '62px "Comic Sans"';
	ctx.fillText('Focusing Lens #2', 120, iYcoord);
	iYcoord += 70;

	ctx.font = '54px "Comic Sans"';
	for(var propertyName in Lens2Params) {
		ctx.fillText(propertyName + " " + Lens2Params[propertyName], 120, iYcoord);
		iYcoord += 54;
	}

}


// ES_problem if true, MS problem otherwise
function StartAutomesh(p_type, path_to_file)
{
	return new Promise((resolve, reject) => {
		
		if ( (p_type == ProblemType.ES) && !SuperfishParams.CalcESField) {
			// exit in case ES field calc was not demanded
			resolve();
			return;
		}
		if ( (p_type == ProblemType.MS) && !SuperfishParams.CalcMSField) {
			// exit in case MS field calc was not demanded
			resolve();
			return;
        }
        if ( (p_type == ProblemType.DS) && !SuperfishParams.CalcDSField) {
            // exit in case DS field calc was not demanded
			resolve();
			return;
		}
        if ( (p_type == ProblemType.DS2) && !SuperfishParams.CalcDS2Field) {
            // exit in case DS2 field calc was not demanded
            ServerState = srv_state.ServerEnum.AUTOMESH;
			resolve();
			return;
		}

		var startDate = new Date();
		console.log("Starting automesh...");
		var child = child_process.execFile(SF_PathAutomesh, [path_to_file]);

		child.on('exit', (code) =>
		{
			if (code != 0)
				reject('can not proceed');
			else
			{
				console.log("Finished in " + (new Date() - startDate) + "ms\n");
				
                if (p_type == ProblemType.DS)	// make sure state changes on ES/MS/DS has been processed
                    ServerState = srv_state.ServerEnum.AUTOMESH;
				resolve();
			}
		});
	});
}

function StartPoisson(p_type, path_to_file)
{
	return new Promise((resolve, reject) => {

		if ( (p_type == ProblemType.ES) && !SuperfishParams.CalcESField) {
			// exit in case ES field calc was not demanded
			resolve();
			return;
		}
		if ( (p_type == ProblemType.MS) && !SuperfishParams.CalcMSField) {
			// exit in case MS field calc was not demanded
			resolve();
			return;
        }
        if ( (p_type == ProblemType.DS) && !SuperfishParams.CalcDSField) {
            // exit in case DS field calc was not demanded
			resolve();
			return;
        }
        if ( (p_type == ProblemType.DS2) && !SuperfishParams.CalcDS2Field) {
            // exit in case DS field calc was not demanded
            ServerState = srv_state.ServerEnum.AUTOMESH;
			resolve();
			return;
		}

		var startDate = new Date();
		console.log("Starting Poisson...");
		var child = child_process.execFile(SF_PathPoisson, [path_to_file]);

		child.on('exit', (code) =>
		{
			console.log("Finished in " + (new Date() - startDate) + "ms\n");
			
            if (p_type == ProblemType.DS)	// make sure state changes on ES/MS/DS has been processed
                ServerState = srv_state.ServerEnum.POISSON;
			resolve();
		});
	});
}

function StartSF7(p_type, path_to_file)
{
	return new Promise((resolve, reject) => {

		if ( (p_type == ProblemType.ES) && !SuperfishParams.CalcESField) {
			// exit in case ES field calc was not demanded
			resolve();
			return;
		}
		if ( (p_type == ProblemType.MS) && !SuperfishParams.CalcMSField) {
			// exit in case MS field calc was not demanded
			resolve();
			return;
        }
        if ( (p_type == ProblemType.DS) && !SuperfishParams.CalcDSField) {
            // exit in case DS field calc was not demanded
			resolve();
			return;
		}
        if ( (p_type == ProblemType.DS2) && !SuperfishParams.CalcDS2Field) {
            // exit in case DS2 field calc was not demanded
            ServerState = srv_state.ServerEnum.AUTOMESH;
			resolve();
			return;
		}

		var pathDir = path_to_file.substr(0, path_to_file.lastIndexOf("\\") + 1);
	
		if (p_type == ProblemType.ES) {
		var in7  = 'Grid                  ! Creates input 2-D field map for Parmela\r\n';
			in7 += '0, 0, 7.5, 15         ! Grid corners for map\r\n';
			in7 += FieldW.Dim.EFx_IntervNumber + ' ' + FieldW.Dim.EFy_IntervNumber;
			in7 += '             ! Number of radial and longitudinal increments \r\n';
			in7 += 'end\r\n';
		}
		else if (p_type == ProblemType.MS) {
		var in7  = 'Grid                  ! Creates input 2-D field map for Parmela\r\n';
			in7 += '0, -45, 7.5, 15       ! Grid corners for map\r\n';
			in7 += FieldW.Dim.MFx_IntervNumber + ' ' + FieldW.Dim.MFy_IntervNumber;
			in7 += '             ! Number of radial and longitudinal increments \r\n';
			in7 += 'end\r\n';
        }
		else if (p_type == ProblemType.DS) {
        var in7  = 'Grid                  ! Creates input 2-D field map for Parmela\r\n';
            in7 += '0, 0, 15, 15          ! Grid corners for map\r\n';
            in7 += FieldW.Dim.DFx_IntervNumber + ' ' + FieldW.Dim.DFy_IntervNumber;
            in7 += '               ! Number of radial and longitudinal increments \r\n';
            in7 += 'end\r\n';
        }
        else if (p_type == ProblemType.DS2) {
        var in7  = 'Grid                  ! Creates input 2-D field map for Parmela\r\n';
            in7 += '0, 0, 15, 15          ! Grid corners for map\r\n';
            in7 += FieldW.Dim.DF2x_IntervNumber + ' ' + FieldW.Dim.DF2y_IntervNumber;
            in7 += '               ! Number of radial and longitudinal increments \r\n';
            in7 += 'end\r\n';
        }
		
		fs.writeFileSync(pathDir + '1.IN7', in7);

		var startDate = new Date();
		console.log("Starting SF7...");
			var child = child_process.execFile(SF_SF7, [path_to_file]);

			child.on('exit', (code) =>
			{
				console.log("Finished in " + (new Date() - startDate) + "ms\n");

                if (p_type == ProblemType.DS)	// make sure state changes on ES/MS/DS has been processed
                    ServerState = srv_state.ServerEnum.SF7;
				resolve();
			});
	});
}

function StartWSFPlot(p_type, path_to_file)
{
	return new Promise((resolve, reject) => {

        if (!SuperfishParams.PlotFields) {
			resolve();
			return;
		}

		if ( (p_type == ProblemType.ES) && !SuperfishParams.CalcESField) {
			// exit in case ES field calc was not demanded
			resolve();
			return;
		}
		if ( (p_type == ProblemType.MS) && !SuperfishParams.CalcMSField) {
			// exit in case MS field calc was not demanded
			resolve();
			return;
        }
        if ( (p_type == ProblemType.DS) && !SuperfishParams.CalcDSField) {
            // exit in case DS field calc was not demanded
			resolve();
			return;
        }
        if ( (p_type == ProblemType.DS2) && !SuperfishParams.CalcDS2Field) {
            // exit in case DS field calc was not demanded
			resolve();
			return;
		}

		console.log("Starting WSFPlot");
			var wsf_child = child_process.execFile(SF_WSPlot, [path_to_file]);
			
			// launch new process waiting until WSFPlot fully starts
			var child = child_process.spawn('cmd.exe', ['/c', Tmt], {detached: true});
			child.on('exit', (code) => {
				resolve(wsf_child);		
			});
	});
}

function StartWSFPlotSendCommands(p_type, wsf_child)
{
	return new Promise((resolve, reject) => {

        if (!SuperfishParams.PlotFields) {
            ServerState = srv_state.ServerEnum.WSFPlot;
			resolve();
			return;
		}

		if ( (p_type == ProblemType.ES) && !SuperfishParams.CalcESField) {
			// exit in case ES field calc was not demanded
			resolve();
			return;
		}
		if ( (p_type == ProblemType.MS) && !SuperfishParams.CalcMSField) {
			// exit in case MS field calc was not demanded
			resolve();
			return;
        }
        if ( (p_type == ProblemType.DS) && !SuperfishParams.CalcDSField) {
            // exit in case DS field calc was not demanded
			resolve();
			return;
        }        
        if ( (p_type == ProblemType.DS2) && !SuperfishParams.CalcDS2Field) {
            // exit in case DS field calc was not demanded
            ServerState = srv_state.ServerEnum.WSFPlot;
			resolve();
			return;
		}

		// saves png image with the name according to internal autoincrement rule
		console.log("Sending WSFPlot commands");
		if (p_type == ProblemType.ES)
			child_process.exec('cmd /c start "" cmd /c ' + SendKeys + ' ' + SF_Title + ' "%co{TAB}{TAB}850{TAB}1700~c"');
		else
			child_process.exec('cmd /c start "" cmd /c ' + SendKeys + ' ' + SF_Title + ' "%co{TAB}{TAB}1700{TAB}6800~c"');

		var child = child_process.spawn('cmd.exe', ['/c', Tmt], {detached: true});

		child.on('exit', (code) => {
			wsf_child.kill('SIGINT');
			
            if (p_type == ProblemType.DS2)	// make sure state changes on ES/MS/DS has been processed
                ServerState = srv_state.ServerEnum.WSFPlot;
			console.log("Finishing WSFPlot\n");
		
			resolve();
		});
	});
}

function StartSuperFish()
{

	function chainError(err) {
		return Promise.reject(err)
	};


    StartAutomesh(ProblemType.ES, SF_ES_SourcePath)
    .then( () => { return StartAutomesh(ProblemType.MS, SF_MS_SourcePath); }, chainError)
    .then( () => { return StartAutomesh(ProblemType.DS, SF_DS_SourcePath); }, chainError)
    .then( () => { return StartAutomesh(ProblemType.DS2, SF_DS2_SourcePath); }, chainError)
    .then( () => { return StartPoisson(ProblemType.ES, SF_ES_t35Path); }, chainError)
    .then( () => { return StartPoisson(ProblemType.MS, SF_MS_t35Path); }, chainError)
    .then( () => { return StartPoisson(ProblemType.DS, SF_DS_t35Path); }, chainError)
    .then( () => { return StartPoisson(ProblemType.DS2, SF_DS2_t35Path); }, chainError)
    .then( () => { return StartSF7(ProblemType.ES, SF_ES_t35Path); }, chainError)
    .then( () => { return StartSF7(ProblemType.MS, SF_MS_t35Path); }, chainError)
    .then( () => { return StartSF7(ProblemType.DS, SF_DS_t35Path); }, chainError)
    .then( () => { return StartSF7(ProblemType.DS2, SF_DS2_t35Path); }, chainError)
    .then( () => { return StartWSFPlot(ProblemType.ES,  SF_ES_t35Path); }, chainError)
    .then( (wsf_child) => { return StartWSFPlotSendCommands(ProblemType.ES, wsf_child); }, chainError)
    .then( () => { return StartWSFPlot(ProblemType.MS, SF_MS_t35Path); }, chainError)
    .then( (wsf_child) => { return StartWSFPlotSendCommands(ProblemType.MS, wsf_child); }, chainError)
    .then( () => { return StartWSFPlot(ProblemType.DS, SF_DS_t35Path); }, chainError)
    .then( (wsf_child) => { return StartWSFPlotSendCommands(ProblemType.DS, wsf_child); }, chainError)
    .then( () => { return StartWSFPlot(ProblemType.DS2, SF_DS2_t35Path); }, chainError)
    .then( (wsf_child) => { return StartWSFPlotSendCommands(ProblemType.DS2, wsf_child); }, chainError)
    .then( () => {	return ReadFieldValues(ProblemType.ES, SF_ES_SourcePath, FieldW.aEF_values); }, chainError)
    .then( () => {	return ReadFieldValues(ProblemType.MS, SF_MS_SourcePath, FieldW.aMF_values); }, chainError)
    .then( () => {	return ReadFieldValues(ProblemType.DS, SF_DS_SourcePath, FieldW.aDF_values); }, chainError)
    .then( () => {	return ReadFieldValues(ProblemType.DS2, SF_DS2_SourcePath, FieldW.aDF2_values); }, chainError)
    .then( () => {	return DrawFieldValues(true,  SF_ES_SourcePath, []); }, chainError)
    .then( (aInd) => {	return DrawFieldValues(false, SF_MS_SourcePath, aInd); }, chainError)        
    .then( (aInd) => {	DrawElectronMap(aInd); }, chainError)
    .catch( (e) => { console.log(e); ServerState = srv_state.ServerEnum.ONLINE; } );
	
}
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

var child_process = require('child_process');

if (process.env.NODE_ENV !== 'production') {
	require('dotenv').config();
  }

const SF_PathAutomesh = "C:\\LANL\\AUTOMESH.EXE";
const SF_PathPoisson = 'C:\\LANL\\POISSON.EXE';
const SF_WSPlot = 'C:\\LANL\\WSFPLOT.EXE';
const SF_SF7 = 'C:\\LANL\\SF7.EXE';
const SendKeys = '.\\BashScripts\\SendKeys.bat';
const Tmt = '.\\BashScripts\\tmt.bat';
const SF_Title = '"WSFPplot 7.17 --- Poisson Superfish Plotting Program     File 1.T35"';
const SF_TitleProp = '"Bit Image File Output (PCX/BMP/PNG format)"';
const SF_ES_SourcePath = 'C:\\LANL\\Examples\\Electrostatic\\Try\\1.am';
const SF_MS_SourcePath = 'C:\\LANL\\Examples\\Magnetostatic\\Try\\1.am';
const SF_ES_t35Path = 'C:\\LANL\\Examples\\Electrostatic\\Try\\1.T35';
const SF_MS_t35Path = 'C:\\LANL\\Examples\\Magnetostatic\\Try\\1.T35';

var ResultImagePath;

var fileLog1;
var fileLog2;


var SuperfishParams;
var CathodeParams;
var AnodeParams;
var PlasmaParams;
var Lens1Params;
var Lens2Params;

var EF_IntervNumber = 1000;
var EF_IntervBoundN = EF_IntervNumber + 1;
var EF_IntervLength = 15.0/EF_IntervNumber;	// mm

var aEF_values = [];
var aMF_values = [];

const canvas_w = 1700;		// 1500 + margins
const canvas_h = 6270;		// 4500 + margins - [image alignment shift]

const { createCanvas, loadImage } = require('canvas')
const canvas = createCanvas(canvas_w, canvas_h)
const ctx = canvas.getContext('2d')
const { Image } = require('image-js');

var ServerState = srv_state.ServerEnum.ONLINE;

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
	// UsePrecalcFields;		  	// Skip fields calculation
	// CathDarkSpace;		    	// distance of dark space in cm

	SuperfishParams = req.body.SuperfishParams;
	CathodeParams   = req.body.CathodeParams;
	AnodeParams     = req.body.AnodeParams;
    PlasmaParams    = req.body.PlasmaParams;
    Lens1Params     = req.body.Lens1Params;
    Lens2Params     = req.body.Lens2Params;

	SuperfishParams.AutofishES.replace(/\n/g, "\r\n");
	SuperfishParams.AutofishMS.replace(/\n/g, "\r\n");

	// ----------------------
	// Electrostatic: 15cm x 15cm zone
	EF_IntervNumber = parseFloat(SuperfishParams.SFIntGran);
	EF_IntervBoundN = EF_IntervNumber + 1;
	EF_IntervLength = 15.0/EF_IntervNumber;		// mm

	// Magnetostatic: 15cm x 60cm zone
	MFx_IntervNumber = parseFloat(SuperfishParams.SFIntGran);
	MFx_IntervBoundN = MFx_IntervNumber + 1;
	MFx_IntervLength = 15.0/MFx_IntervNumber;	// mm

	MFy_IntervNumber = parseFloat(SuperfishParams.SFIntGran)*4;	//  <---
	MFy_IntervBoundN = MFy_IntervNumber + 1;
	MFy_IntervLength = 60.0/MFy_IntervNumber;	// mm
	// ----------------------

	setImmediate(() => {
		if (SuperfishParams.CalcESField)	
			fs.writeFileSync(SF_ES_SourcePath, SuperfishParams.AutofishES);
		if (SuperfishParams.CalcMSField)	
			fs.writeFileSync(SF_MS_SourcePath, SuperfishParams.AutofishMS);

		StartSuperFish();
	});

    return res.send({
      success: true });
});


app.listen(3000, () => console.log("Running at Port 3000"));


function ReadFieldValues(ES_problem, path_to_file, aF_values)
{
	return new Promise(function(resolve,reject) {

		aF_values.length = 0;
	
		console.log('Reading Field values...');
		
		var bStartFound = false;
		var strMatch = ES_problem ? "    (cm)          (cm)           (V/cm)        (V/cm)        (V/cm)         (V)  ":
									"    (cm)          (cm)             (G)           (G)           (G)         (G-cm)        (G/cm)        (G/cm)        (G/cm)";

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
			aF_values.push(aPoint.map(parseFloat).slice(2,4)); // get E(or B)x,E(or B)y only
		});

		rd.on('close', () => {
			console.log("Read " + aF_values.length + " items");
			ServerState = srv_state.ServerEnum.EFRead;
			resolve();
		});
	});
}



// Fetches interpolated value from aF_values
function _PeekField(/*in*/ x, y, z,
						   aF_values,
						   Fx_IntervBoundN,Fy_IntervBoundN,
						   Fx_IntervLength,Fy_IntervLength)
{
	assert(aF_values.length == Fx_IntervBoundN*Fy_IntervBoundN);

	// Looking from the top of the gun we have polar coordinate system:
	// All coordinates on a circle with the center in p(7.5,y,0) have the same field as the point
	// of intersection of the circle with known XoY plane values

	//										   |
    //                                        ...         _
	//								     ..    |    ..    \ -alpha
	//								 ..        |       ..
	//								..         | p       .. alpha=0
	//			                 --------------o---------o-----> X
	//				                ..        /| alpha   .. (x^2+z^2;y,0)
	//								  ..     / |       ..   
	//								     .. /  |    ..    /_ +alpha
	//								       o  ...
	//									  /    |
	//								  x;y;z	  \/ Z

	x -= 7.5;								        // shift the gun so its center coincide with oY axis
	var alpha = Math.atan2(z,x);			        // measure the angle (-pi<alpha<pi)
	if (x < 0) alpha += Math.PI;			        // negative oX direction is 180 deg behind, compensate
    if (x < 0) x = -Math.sqrt(x*x + z*z);	        // z=0 (rotate given vector to xOz plane)
    else x = Math.sqrt(x*x + z*z);                  // observe the direction
	x += 7.5;								        // shift back
	
	var xRmdr = x % Fx_IntervLength;				// coord within one cell (e.g. 0<=v<5 )
	var yRmdr = y % Fy_IntervLength;

	var xt = xRmdr/Fx_IntervLength;					// normalized coord within one cell (0<=v<1 )
	var yt = yRmdr/Fy_IntervLength;
  
 	var xInt = Math.floor(x / Fx_IntervLength);		// number of the whole cells within one hor/vert strip
  	var yInt = Math.floor(y / Fy_IntervLength);
	// ----->
	// ----->    
    
    // Watch for staying inside the area of known values
    if ( (xInt +  yInt*Fx_IntervBoundN < 0) || ((xInt+1) + (yInt+1)*Fx_IntervBoundN >= aF_values.length)) {
        var p00 = aF_values[0];
        var p10 = aF_values[0];
        var p01 = aF_values[0];
        var p11 = aF_values[0];
    }
    else {
        var p00 = aF_values[ xInt    +  yInt*Fx_IntervBoundN];
        var p10 = aF_values[(xInt+1) +  yInt*Fx_IntervBoundN];
        var p01 = aF_values[ xInt    + (yInt+1)*Fx_IntervBoundN];
        var p11 = aF_values[(xInt+1) + (yInt+1)*Fx_IntervBoundN];
    }

if (p00 === undefined)
    console.log("");

	var field = [ VecMath.LinearInterpolate(VecMath.LinearInterpolate(p00[0],p10[0], xt), VecMath.LinearInterpolate(p01[0],p11[0], xt), yt),
                  VecMath.LinearInterpolate(VecMath.LinearInterpolate(p00[1],p01[1], yt), VecMath.LinearInterpolate(p10[1],p11[1], yt), xt) ];

	// rotate result field from xOy plane around oY axis
	fSin = Math.sin(alpha);	fCos = Math.cos(alpha);

	//field[2] = 0;

	fieldN = [];
	fieldN[1] = field[1];
	fieldN[0] = field[0]*fCos;// - field[2]*fSin;
	fieldN[2] = field[0]*fSin;// + field[2]*fCos;

    return fieldN;
    
    //return field;
}

function PeekMagnField(/*in*/ vPos)
{
    aMgField = _PeekField(vPos[0], vPos[1]+45.0, vPos[2],
                          aMF_values,
                          MFx_IntervBoundN,MFy_IntervBoundN,
                          MFx_IntervLength,MFy_IntervLength);

    // G -> T
    aMgField[0] *= 0.0001; aMgField[1] *= 0.0001; aMgField[2] *= 0.0001;
    return aMgField;
}

function PeekElectrField(/*in*/ vPos)
{
    // electric field is only calculated for y > 0, other places have negligibly small field
    if (vPos[1] < 0.0) return [0,0,0];
   
    aElField = _PeekField(vPos[0], vPos[1], vPos[2],
                          aEF_values,
                          EF_IntervBoundN,EF_IntervBoundN,
                          EF_IntervLength,EF_IntervLength);

    // V/cm -> V/m
    aElField[0] *= 100.0; aElField[1] *= 100.0; aElField[2] *= 100.0;
    return aElField;
}

// Calculates electron velocity taking field strength and the current speed
//                 cm cm cm  m/s
function ForceFunc(vPos,     VelPrev)
{
	Qe    =-1.60217662e-19;	// coul
	Vc_2  = 89875.517e12;	// m/s
	Me    = 9.10938356e-31;	// kg
	Qe_Me = Qe/Me;

    //Me=3.32e-24;	//H2 molecule
    
    // sample fields in the current point
	E = PeekElectrField(vPos);  // V/m
    B = PeekMagnField(vPos);    // T

	var VPrevSqr = VecMath.VectorDot(VelPrev, VelPrev);
	LorentzContraction = Math.pow( 1.0-(VPrevSqr)/Vc_2, 1.5 );

	var VxB = VecMath.VectorCross(VelPrev, B);

    Aspeed = LorentzContraction * Qe/Me*( E[0] + VxB[0] );
    Bspeed = LorentzContraction * Qe/Me*( E[1] + VxB[1] );
	Cspeed = LorentzContraction * Qe/Me*( E[2] + VxB[2] );

	return [Aspeed, Bspeed, Cspeed];
}

// Calculates electron velocity taking field strength and the current speed
//            cm cm cm  m/s        s
function Vxyz(vPos,     vVelPrev,  dt)
{
    k1 = ForceFunc(vPos, vVelPrev);

    vNew  = VecMath.VectorAdd(vVelPrev, VecMath.VectorMult(dt, k1));
    vPosN = VecMath.VectorAdd(vPos,  VecMath.VectorMult(dt*100.0*0.5, VecMath.VectorAdd(vVelPrev, vNew)) );
    k2 = ForceFunc(vPosN, vNew);

    v = VecMath.VectorAdd(vVelPrev, VecMath.VectorMult(dt*0.5, VecMath.VectorAdd(k1, k2)));

    return v;
}


function EmitElectrons()
{
const fShort = 0.022;	// cm

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
        TraceElectronTrajectory(xp, yp, zp);
    }

    for (var i = 0; i < 30; i++) {
		var xpR = CathodeParams.SFFocusX + (CathodeParams.CathFocusR-fShort)*Math.cos(Math.PI/2.0 + CathodeParams.SFBeamHalfAngle - CathodeParams.SFBeamHalfAngle*0.5);
		var yp  = CathodeParams.SFFocusY + (CathodeParams.CathFocusR-fShort)*Math.sin(Math.PI/2.0 + CathodeParams.SFBeamHalfAngle - CathodeParams.SFBeamHalfAngle*0.5);

        var xp = CathodeParams.SFFocusX + (xpR-7.5)*Math.cos(2.0*Math.PI*i/30);
        var zp =                          (xpR-7.5)*Math.sin(2.0*Math.PI*i/30);

         ctx.fillStyle = "PaleGreen";
        TraceElectronTrajectory(xp, yp, zp);
    }

    for (var i = 0; i < 30; i++) {
		var xpR = CathodeParams.SFFocusX + (CathodeParams.CathFocusR-fShort)*Math.cos(Math.PI/2.0 + CathodeParams.SFBeamHalfAngle - CathodeParams.SFBeamHalfAngle*0.8);
		var yp  = CathodeParams.SFFocusY + (CathodeParams.CathFocusR-fShort)*Math.sin(Math.PI/2.0 + CathodeParams.SFBeamHalfAngle - CathodeParams.SFBeamHalfAngle*0.8);

        var xp = CathodeParams.SFFocusX + (xpR-7.5)*Math.cos(2.0*Math.PI*i/30);
        var zp =                          (xpR-7.5)*Math.sin(2.0*Math.PI*i/30);

         ctx.fillStyle = "OrangeRed";
        TraceElectronTrajectory(xp, yp, zp);
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

// x,y- cm
function TraceElectronTrajectory(x,y,z)
{
var aVelXYZ  = [0.0, 0.0, 0.0];
var vOldVel  = [0.0, 0.0, 0.0];

var vPos = [x,y,z];     // cm

var dt=1e-11;
const Vc=299.7915942e6;	// m/s


	for (let i=0; i<120000; i++)
	{
		if (Math.sqrt(VecMath.sqr(vPos[0] - 7.5) + VecMath.sqr(vPos[2])) > 7.5) break;
		if ((vPos[1] < -45) || (vPos[1] >= 15.0)) break;

		// draw electron position
		var pt_x = vPos[0]*100.0 + 100;
		var pt_y = 1600 - vPos[1]*100.0;
        ctx.fillRect(pt_x, pt_y, 5,5);

        if (vPos[0] === NaN)
            console.log("")

		// calculate new velocity vector
        aVelXYZ = Vxyz(vPos, vOldVel, dt);
        
		// console.log("x: " + fPosX.toPrecision(4) + ", y:" + fPosY.toPrecision(4) + ", z:" + fPosZ.toPrecision(4) + "\n");
	    // console.log("  Ex: " + aElField[0].toPrecision(8) + ", Ey:" + aElField[1].toPrecision(8) + ", Ez:" + aElField[2].toPrecision(8) + "\n");
        // console.log("  Ckx: " +aVelXYZ[0].toPrecision(4) + ", Cky:" + aVelXYZ[1].toPrecision(4) + ", Ckz:" + aVelXYZ[2].toPrecision(4) + "\n");
        // console.log("  Ck:" + Math.sqrt(aVelXYZ[0]*aVelXYZ[0] + aVelXYZ[1]*aVelXYZ[1] + aVelXYZ[2]*aVelXYZ[2]).toPrecision(4) + "\n");

		// fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "x: " + fPosX.toPrecision(4) + ", y:" + fPosY.toPrecision(4) + ", z:" + fPosZ.toPrecision(4) + "\n");
	    // fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "  Ex: " + aElField[0].toPrecision(8) + ", Ey:" + aElField[1].toPrecision(8) + ", Ez:" + aElField[2].toPrecision(8) + "\n");
        // fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "  Ckx: " +aVelXYZ[0].toPrecision(4) + ", Cky:" + aVelXYZ[1].toPrecision(4) + ", Ckz:" + aVelXYZ[2].toPrecision(4) + "\n");
        // fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "  Ck:" + Math.sqrt(aVelXYZ[0]*aVelXYZ[0] + aVelXYZ[1]*aVelXYZ[1] + aVelXYZ[2]*aVelXYZ[2]).toPrecision(4) + "\n");
        // fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "  V:" + Math.sqrt(fOldVelX*fOldVelX + fOldVelZ*fOldVelZ) + "\n");

		// // m/s -> cm/s results in *100
        vPos = VecMath.VectorAdd(vPos,  VecMath.VectorMult(dt*100.0*0.5, VecMath.VectorAdd(vOldVel, aVelXYZ)) );

        vOldVel = [...aVelXYZ]; // deep copy
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
            
            if (ES_problem)
                ctx.drawImage(image, 0,0);//, canvas_w,canvas_h);
            else
                ctx.drawImage(image, 0,-304);//, canvas_w,canvas_h);
            
            resolve(result_ind);
            }
        );

	});
}


// function takes two recent images of ES and MS problems
// draws them to the result image, adds electron traces and params
function DrawElectronMap(aInd)
{
	console.log("Tracing electrons");

    EmitElectrons();

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
function StartAutomesh(ES_problem, path_to_file)
{
	return new Promise((resolve, reject) => {
		
		if ( ES_problem && !SuperfishParams.CalcESField) {
			// exit in case ES field calc was not demanded
			resolve();
			return;
		}
		if (!ES_problem && !SuperfishParams.CalcMSField) {
			// exit in case MS field calc was not demanded
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
				
                if (!ES_problem || !SuperfishParams.CalcMSField)	// make sure state changes on ES and MS has been processed
                    ServerState = srv_state.ServerEnum.AUTOMESH;
				resolve();
			}
		});
	});
}

function StartPoisson(ES_problem, path_to_file)
{
	return new Promise((resolve, reject) => {

		if ( ES_problem && !SuperfishParams.CalcESField) {
			// exit in case ES field calc was not demanded
			resolve();
			return;
		}
		if (!ES_problem && !SuperfishParams.CalcMSField) {
			// exit in case MS field calc was not demanded
			resolve();
			return;
		}

		var startDate = new Date();
		console.log("Starting Poisson...");
		var child = child_process.execFile(SF_PathPoisson, [path_to_file]);

		child.on('exit', (code) =>
		{
			console.log("Finished in " + (new Date() - startDate) + "ms\n");
			
			if (!ES_problem || !SuperfishParams.CalcMSField)	// make sure state changes on ES and MS has been processed
				ServerState = srv_state.ServerEnum.POISSON;
			resolve();		
		});
	});
}

function StartSF7(ES_problem, path_to_file)
{
	return new Promise((resolve, reject) => {

		if ( ES_problem && !SuperfishParams.CalcESField) {
			// exit in case ES field calc was not demanded
			resolve();
			return;
		}
		if (!ES_problem && !SuperfishParams.CalcMSField) {
			// exit in case MS field calc was not demanded
			resolve();
			return;
		}

		var pathDir = path_to_file.substr(0, path_to_file.lastIndexOf("\\") + 1);
	
		if (ES_problem) {
		var in7  = 'Grid                  ! Creates input 2-D field map for Parmela\r\n';
			in7 += '0, 0, 15, 15          ! Grid corners for map\r\n';
			in7 += EF_IntervNumber + ' ' + EF_IntervNumber;
			in7 += '             ! Number of radial and longitudinal increments \r\n';
			in7 += 'end\r\n';
		}
		else {
		var in7  = 'Grid                  ! Creates input 2-D field map for Parmela\r\n';
			in7 += '0, -45, 15, 15        ! Grid corners for map\r\n';
			in7 += MFx_IntervNumber + ' ' + MFy_IntervNumber;
			in7 += '             ! Number of radial and longitudinal increments \r\n';
			in7 += 'end\r\n';
		}
		
		fs.writeFileSync(pathDir + '1.IN7', in7);

		var startDate = new Date();
		console.log("Starting SF7...");
			var child = child_process.execFile(SF_SF7, [path_to_file]);

			child.on('exit', (code) =>
			{
				console.log("Finished in " + (new Date() - startDate) + "ms\n");

				if (!ES_problem || !SuperfishParams.CalcMSField)	// make sure state changes after ES and MS has been processed
					ServerState = srv_state.ServerEnum.SF7;
				resolve();		
			});
	});
}

function StartWSFPlot(ES_problem, path_to_file)
{
	return new Promise((resolve, reject) => {

        if (!SuperfishParams.PlotFields) {
			resolve();
			return;
		}

		if ( ES_problem && !SuperfishParams.CalcESField) {
			// exit in case ES field calc was not demanded
			resolve();
			return;
		}
		if (!ES_problem && !SuperfishParams.CalcMSField) {
			// exit in case MS field calc was not demanded
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

function StartWSFPlotSendCommands(ES_problem, wsf_child)
{
	return new Promise((resolve, reject) => {

        if (!SuperfishParams.PlotFields) {
            ServerState = srv_state.ServerEnum.WSFPlot;
			resolve();
			return;
		}

		if ( ES_problem && !SuperfishParams.CalcESField) {
			// exit in case ES field calc was not demanded
			resolve();
			return;
		}
		if (!ES_problem && !SuperfishParams.CalcMSField) {
            // exit in case MS field calc was not demanded
            ServerState = srv_state.ServerEnum.WSFPlot;

			resolve();
			return;
		}

		// saves png image with the name according to internal autoincrement rule
		console.log("Sending WSFPlot commands");
		if (ES_problem)
			child_process.exec('cmd /c start "" cmd /c ' + SendKeys + ' ' + SF_Title + ' "%co{TAB}{TAB}1700{TAB}1700~c"');
		else
			child_process.exec('cmd /c start "" cmd /c ' + SendKeys + ' ' + SF_Title + ' "%co{TAB}{TAB}1700{TAB}6800~c"');

		var child = child_process.spawn('cmd.exe', ['/c', Tmt], {detached: true});

		child.on('exit', (code) => {
			wsf_child.kill('SIGINT');
			
			if (!ES_problem || !SuperfishParams.CalcMSField)	// make sure state changes on ES and MS has been processed
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

	if (SuperfishParams.UsePrecalcFields)
	{
		StartWSFPlot(true,  SF_ES_t35Path)
		.then( (wsf_child) => { return StartWSFPlotSendCommands(true, wsf_child); }, chainError)
		.then( () => { return StartWSFPlot(false, SF_MS_t35Path); }, chainError)
		.then( (wsf_child) => { return StartWSFPlotSendCommands(false, wsf_child); }, chainError)
		.then( () => {	return ReadFieldValues(true,  SF_ES_SourcePath, aEF_values); }, chainError)
        .then( () => {	return ReadFieldValues(false, SF_MS_SourcePath, aMF_values); }, chainError)
		.then( () => {	return DrawFieldValues(true,  SF_ES_SourcePath, []); }, chainError)
        .then( (aInd) => {	return DrawFieldValues(false, SF_MS_SourcePath, aInd); }, chainError)        
		.then( (aInd) => {	DrawElectronMap(aInd); }, chainError)
		.catch( (e) => { console.log(e); ServerState = srv_state.ServerEnum.ONLINE; } );
	}
	else
	{
		StartAutomesh(true, SF_ES_SourcePath)
		.then( () => { return StartAutomesh(false, SF_MS_SourcePath); }, chainError)
		.then( () => { return StartPoisson(true,  SF_ES_t35Path); }, chainError)
		.then( () => { return StartPoisson(false, SF_MS_t35Path); }, chainError)
		.then( () => { return StartSF7(true,  SF_ES_t35Path); }, chainError)
		.then( () => { return StartSF7(false, SF_MS_t35Path); }, chainError)
		.then( () => { return StartWSFPlot(true,  SF_ES_t35Path); }, chainError)
		.then( (wsf_child) => { return StartWSFPlotSendCommands(true, wsf_child); }, chainError)
		.then( () => { return StartWSFPlot(false, SF_MS_t35Path); }, chainError)
		.then( (wsf_child) => { return StartWSFPlotSendCommands(false, wsf_child); }, chainError)
		.then( () => {	return ReadFieldValues(true,  SF_ES_SourcePath, aEF_values); }, chainError)
        .then( () => {	return ReadFieldValues(false, SF_MS_SourcePath, aMF_values); }, chainError)
		.then( () => {	return DrawFieldValues(true,  SF_ES_SourcePath, []); }, chainError)
        .then( (aInd) => {	return DrawFieldValues(false, SF_MS_SourcePath, aInd); }, chainError)        
		.then( (aInd) => {	DrawElectronMap(aInd); }, chainError)
		.catch( (e) => { console.log(e); ServerState = srv_state.ServerEnum.ONLINE; } );
	}
	
}
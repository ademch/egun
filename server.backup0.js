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

var child_process = require('child_process');

const SF_PathAutomesh = "C:\\LANL\\AUTOMESH.EXE";
const SF_PathPoisson = 'C:\\LANL\\POISSON.EXE';
const SF_WSPlot = 'C:\\LANL\\WSFPLOT.EXE';
const SF_SF7 = 'C:\\LANL\\SF7.EXE';
const SendKeys = 'C:\\LANL\\SendKeys.bat';
const Tmt = 'C:\\LANL\\tmt.bat';
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

var ServerState = srv_state.ServerEnum.ONLINE;

var app = express();
//app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.text());
//app.use(express.json());
app.use(express.static(__dirname));
//app.use(express.urlencoded());


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


function TriangleArea(xa,xb,xc, ya,yb,yc) {
	return 0.5*Math.abs((xa-xc)*(yb-ya)-(xa-xb)*(yc-ya));
}

function LinearInterpolate(a,b, t) {
	return a*(1.0-t) + b*t;
}

function sqr(v) {
	return v*v;
}

function VectorCross(a, b)
{
	var x = a[1] * b[2] - a[2] * b[1];
	var y = a[2] * b[0] - a[0] * b[2];
	var z = a[0] * b[1] - a[1] * b[0];

	return [x,y,z];
}

function VectorDot(a, b)
{
	var x = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

	return x;
}

function VectorAngle(a, b)
{
    var l1 = Math.sqrt(VectorDot(a, a));
    if (l1 < Number.EPSILON) return 0;

    var l2 = Math.sqrt(VectorDot(b, b));
    if (l2 < Number.EPSILON) return 0;

    var cosTheta = VectorDot(a, b)/(l1*l2);

    if (cosTheta > 1.0) return 0;   // num instability

    return Math.acos(cosTheta);
}

function VectorMult(s, v) {
	var x = s * v[0];
	var y = s * v[1];
	var z = s * v[2];

	return [x,y,z];
}

function VectorAdd(v0, v1) {
	var x = v0[0] + v1[0];
	var y = v0[1] + v1[1];
	var z = v0[2] + v1[2];

	return [x,y,z];
}

function VectorMix(v0, v1, t) {
	var x = v0[0]*(1.0-t) + v1[0]*t;
	var y = v0[1]*(1.0-t) + v1[1]*t;
	var z = v0[2]*(1.0-t) + v1[2]*t;

	return [x,y,z];
}

function radToDeg(rad) {
    return rad*(180.0/Math.PI);
}

function SLERP(v1, v2, angle, t) {
    if (angle < Number.EPSILON) return VectorMix(v1, v2, t);

    x = Math.sin((1-t)*angle)/Math.sin(angle)*v1[0] + Math.sin(t*angle)/Math.sin(angle)*v2[0];
    y = Math.sin((1-t)*angle)/Math.sin(angle)*v1[1] + Math.sin(t*angle)/Math.sin(angle)*v2[1];
    z = Math.sin((1-t)*angle)/Math.sin(angle)*v1[2] + Math.sin(t*angle)/Math.sin(angle)*v2[2];

    return [x,y,z];
}

function IntegratePosOutOfTwoVelocities(aVel_0, aVel_Next, fPosX, fPosY, fPosZ, dt)
{
    var angle = VectorAngle(aVel_0, aVel_Next);

    dt = dt/10.0;
    
    for (var i=0; i<10; i++) {
        var VelImm = SLERP(aVel_0, aVel_Next, angle, i/10.0);

        // convert m/s -> cm/s
        VelImm = VectorMult(100.0, VelImm);
        
        fPosX += dt*VelImm[0];
		fPosY += dt*VelImm[1];
        fPosZ += dt*VelImm[2];
    }
    return [fPosX, fPosY, fPosZ];
}


// Fetches interpolated value from aF_values
function PeekField(/*in*/ x, y, z,
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

	var field = [ LinearInterpolate(LinearInterpolate(p00[0],p10[0], xt), LinearInterpolate(p01[0],p11[0], xt), yt),
				  LinearInterpolate(LinearInterpolate(p00[1],p01[1], yt), LinearInterpolate(p10[1],p11[1], yt), xt) ];

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


// Calculates electron velocity taking field strength and the current speed
//           V/m    T      m/s       s
function Vxyz(E,    B,     VelPrev,  dt)
{
	Qe    =-1.60217662e-19;	// coul
	Vc_2  = 89875.517e12;	// m/s
	Me    = 9.10938356e-31;	// kg
	Qe_Me = Qe/Me;

	//Me=3.32e-24;	//H2 molecule
	//Ux=-2e6;
	//Uy=2e6;
	//dt=1e-13;

	var VxB = VectorCross(VelPrev, B);

	var VPrevSqr = VelPrev[0]*VelPrev[0] + VelPrev[1]*VelPrev[1] + VelPrev[2]*VelPrev[2];
	LorentzContraction = 1.0/Math.sqrt(1.0-(VPrevSqr)/Vc_2 );

    Acoeff=Qe/Me*( E[0] + VxB[0] )*dt;
	Acoeff+=VelPrev[0]*LorentzContraction;

    Bcoeff=Qe/Me*( E[1] + VxB[1] )*dt;
	Bcoeff+=VelPrev[1]*LorentzContraction;

	Ccoeff=Qe/Me*( E[2] + VxB[2] )*dt;
	Ccoeff+=VelPrev[2]*LorentzContraction;

	Aspeed=Acoeff/Math.sqrt(Vc_2 + Acoeff*Acoeff + Bcoeff*Bcoeff + Ccoeff*Ccoeff);
	Bspeed=Bcoeff/Math.sqrt(Vc_2 + Acoeff*Acoeff + Bcoeff*Bcoeff + Ccoeff*Ccoeff);
	Cspeed=Ccoeff/Math.sqrt(Vc_2 + Acoeff*Acoeff + Bcoeff*Bcoeff + Ccoeff*Ccoeff);

	return [Aspeed, Bspeed, Cspeed];
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
var aVelXYZ = [0.0, 0.0, 0.0];
var fOldVelX = 0;
var fOldVelY = 0;
var fOldVelZ = 0;

var fPosX = x;		// cm
var fPosY = y;		// cm
var fPosZ = z;		// cm

var aElField;
var aMgField;

var dt=1e-11;
const Vc=299.7915942e6;	// m/s


	for (let i=0; i<120000; i++)
	{
		if (Math.sqrt(sqr(fPosX - 7.5) + sqr(fPosZ)) > 7.5) break;
		if ((fPosY < -45) || (fPosY >= 15.0)) break;

		// draw electron position
		var pt_x = fPosX*100.0 + 100;
		var pt_y = 1600 - fPosY*100.0;
        ctx.fillRect(pt_x, pt_y, 5,5);

        if (fPosX === NaN)
        console.log("")
        
        // sample electric field in the current point
        if (fPosY < 0.0)
           aElField = [0,0,0];
        else
		aElField = PeekField(fPosX,fPosY,fPosZ,
							 aEF_values,
							 EF_IntervBoundN,EF_IntervBoundN,
							 EF_IntervLength,EF_IntervLength);
		// V/cm -> V/m
		aElField[0] *= 100.0; aElField[1] *= 100.0; aElField[2] *= 100.0;

		aMgField = [0,0,0];
		aMgField = PeekField(fPosX, fPosY+45.0, fPosZ,
							 aMF_values,
							 MFx_IntervBoundN,MFy_IntervBoundN,
							 MFx_IntervLength,MFy_IntervLength);
		// G -> T
        aMgField[0] *= 0.0001; aMgField[1] *= 0.0001; aMgField[2] *= 0.0001;

		// calculate new velocity vector
        aVelXYZ = Vxyz(aElField, aMgField, [fOldVelX,fOldVelY,fOldVelZ], dt);
        
		// console.log("x: " + fPosX.toPrecision(4) + ", y:" + fPosY.toPrecision(4) + ", z:" + fPosZ.toPrecision(4) + "\n");
	    // console.log("  Ex: " + aElField[0].toPrecision(8) + ", Ey:" + aElField[1].toPrecision(8) + ", Ez:" + aElField[2].toPrecision(8) + "\n");
        // console.log("  Ckx: " +aVelXYZ[0].toPrecision(4) + ", Cky:" + aVelXYZ[1].toPrecision(4) + ", Ckz:" + aVelXYZ[2].toPrecision(4) + "\n");
        // console.log("  Ck:" + Math.sqrt(aVelXYZ[0]*aVelXYZ[0] + aVelXYZ[1]*aVelXYZ[1] + aVelXYZ[2]*aVelXYZ[2]).toPrecision(4) + "\n");

		// fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "x: " + fPosX.toPrecision(4) + ", y:" + fPosY.toPrecision(4) + ", z:" + fPosZ.toPrecision(4) + "\n");
	    // fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "  Ex: " + aElField[0].toPrecision(8) + ", Ey:" + aElField[1].toPrecision(8) + ", Ez:" + aElField[2].toPrecision(8) + "\n");
        // fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "  Ckx: " +aVelXYZ[0].toPrecision(4) + ", Cky:" + aVelXYZ[1].toPrecision(4) + ", Ckz:" + aVelXYZ[2].toPrecision(4) + "\n");
        // fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "  Ck:" + Math.sqrt(aVelXYZ[0]*aVelXYZ[0] + aVelXYZ[1]*aVelXYZ[1] + aVelXYZ[2]*aVelXYZ[2]).toPrecision(4) + "\n");
        // fs.appendFileSync("C:\\LANL\\Examples\\Electrostatic\\Try\\1Log.txt", "  V:" + Math.sqrt(fOldVelX*fOldVelX + fOldVelZ*fOldVelZ) + "\n");


		aVelXYZ[0]*= Vc;
		aVelXYZ[1]*= Vc;
		aVelXYZ[2]*= Vc;

		// // m/s -> cm/s results in *100
        fPosX += dt*100.0*(aVelXYZ[0])/2.0;
		fPosY += dt*100.0*(aVelXYZ[1])/2.0;
        fPosZ += dt*100.0*(aVelXYZ[2])/2.0;

        fOldVelX = aVelXYZ[0];
		fOldVelY = aVelXYZ[1];
        fOldVelZ = aVelXYZ[2];
        
	}
}

// function takes two recent images of ES and MS problems
// draws them to the result image, adds electron traces and params
function DrawElectronMap()
{
	console.log("Tracing electrons");

	// find the last Electrostatic image
	var pathES = SF_ES_SourcePath.substr(0, SF_ES_SourcePath.lastIndexOf("\\") + 1);
	assert(fs.existsSync(pathES + '101.png'));
	var i;
	for (i = 500; i>100; i--) {
		if (fs.existsSync(pathES + i +'.png')) break;
	}

	var filenameES_IN = i;

	// find the last Magnetostatic image
	var pathMS = SF_MS_SourcePath.substr(0, SF_MS_SourcePath.lastIndexOf("\\") + 1);
	assert(fs.existsSync(pathMS + '101.png'));
	var i;
	for (i = 500; i>100; i--) {
		if (fs.existsSync(pathMS + i +'.png')) break;
	}

	var filenameMS_IN = i;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.globalCompositeOperation = 'multiply';

    if (SuperfishParams.PlotFields) {
        PromiseES = loadImage(pathES + filenameES_IN + '.png');
        PromiseMS = loadImage(pathMS + filenameMS_IN + '.png');
    }
    else {  // dummy promises
        PromiseES = new Promise((resolve) => {resolve()});
        PromiseMS = new Promise((resolve) => {resolve()});
    }

	Promise.all([PromiseES, PromiseMS]).then( (images) => {
		images.forEach( (image, index) => {
            if (! SuperfishParams.PlotFields) return;
            
            if (index === 0)
                ctx.drawImage(image, 0,0);//, canvas_w,canvas_h);
			else
				ctx.drawImage(image, 0,-304);//, canvas_w,canvas_h);	
		});

		EmitElectrons();

        DrawParamsOnTheImage();
        
        ResultImagePath = pathES + 'ESMS_' + filenameES_IN + '_' +  filenameMS_IN + '.png'; // save to global var
        var dataBuffer = canvas.toBuffer();
		fs.writeFileSync(ResultImagePath, dataBuffer);

        ServerState = srv_state.ServerEnum.Electron;

        console.log("done");
        console.log("");
	});
}

function DrawParamsOnTheImage()
{
	ctx.fillStyle = "Black";

	var iYcoord = 160;

	ctx.font = '42px "Comic Sans"';
	ctx.fillText('Cathode Params', 120, iYcoord);
	iYcoord += 46;

	ctx.font = '36px "Comic Sans"';
	for(var propertyName in CathodeParams) {
		ctx.fillText(propertyName + " " + CathodeParams[propertyName], 120, iYcoord);
		iYcoord += 36;
	}

	iYcoord += 46;
	ctx.font = '42px "Comic Sans"';
	ctx.fillText('Anode Params', 120, iYcoord);
	iYcoord += 46;

	ctx.font = '36px "Comic Sans"';
	for(var propertyName in AnodeParams) {
		ctx.fillText(propertyName + " " + AnodeParams[propertyName], 120, iYcoord);
		iYcoord += 36;
	}

	iYcoord += 46;
	ctx.font = '42px "Comic Sans"';
	ctx.fillText('Plasma Params', 120, iYcoord);
	iYcoord += 46;

	ctx.font = '36px "Comic Sans"';
	for(var propertyName in PlasmaParams) {
		ctx.fillText(propertyName + " " + PlasmaParams[propertyName], 120, iYcoord);
		iYcoord += 36;
    }
    
    iYcoord += 46;
	ctx.font = '42px "Comic Sans"';
	ctx.fillText('Focusing Lens #1', 120, iYcoord);
	iYcoord += 46;

	ctx.font = '36px "Comic Sans"';
	for(var propertyName in Lens1Params) {
		ctx.fillText(propertyName + " " + Lens1Params[propertyName], 120, iYcoord);
		iYcoord += 36;
    }
    
    iYcoord += 46;
	ctx.font = '42px "Comic Sans"';
	ctx.fillText('Focusing Lens #2', 120, iYcoord);
	iYcoord += 46;

	ctx.font = '36px "Comic Sans"';
	for(var propertyName in Lens2Params) {
		ctx.fillText(propertyName + " " + Lens2Params[propertyName], 120, iYcoord);
		iYcoord += 36;
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
		.then( () => {	DrawElectronMap(); }, chainError)
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
		.then( () => {	DrawElectronMap(); }, chainError)
		.catch( (e) => { console.log(e); ServerState = srv_state.ServerEnum.ONLINE; } );
	}
	
}
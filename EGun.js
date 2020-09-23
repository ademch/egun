var fScaleSuperFish = 0.1;		// SF needs cms
var fScaleGUI       = 3.8;	

var RegionEStatic_W = 150; 		// mm (-iOx)
var RegionEStatic_H = 150;		// mm

var iOx = 75;					// mm
var iOy = 10;					// mm

function rad2deg(radians) {
  return radians * (180.0/Math.PI);
}

function deg2rad(degrees) {
  return degrees * (Math.PI/180.0);
}

function LinearMix(a, b, t) {
	return a*(1.0-t) + b*t;
}


function PrintSuperFishXY(x, y)
{
var el = document.getElementById("ElectrostaticTextArea");
	el.value += "&po x=" + x.toPrecision(4) + "," + "y=" + (RegionEStatic_H*fScaleSuperFish - y).toPrecision(4) + " &\r\n";
}

function _moveTo(x,y, sf_output = true) {
	this.moveTo(x*fScaleGUI, y*fScaleGUI);										    // GUI
	
	if (sf_output) PrintSuperFishXY((x-iOx)*fScaleSuperFish, y*fScaleSuperFish);    // SuperFish
}

function _lineTo(x,y, sf_output = true) {
	this.lineTo(x*fScaleGUI, y*fScaleGUI);										    // GUI
	
	if (sf_output) PrintSuperFishXY((x-iOx)*fScaleSuperFish, y*fScaleSuperFish);    // SuperFish
}

function _fillText(text, x,y) {
    this.fillText(text, x*fScaleGUI,y*fScaleGUI);
}

function PdToP(pd, dist)
{
    dist = dist/10; // mm to cm
    return (133.322*pd/dist).toPrecision(3); 
}


function CircleLineIntersect(xr,yr,r, x1,y1,x2,y2)
{
	if (Math.abs(x1-x2) < Number.EPSILON) {
		rootX1 = x1;
		rootX2 = x1;

		rootY1 = +Math.sqrt(r*r - (x1-xr)*(x1-xr)) + yr;
		rootY2 = -Math.sqrt(r*r - (x1-xr)*(x1-xr)) + yr;

		return [rootX2, rootY2];
	}
	
	var a=xr;
	var b=yr;
	var A=(y2-y1)/(x2-x1);
	var C=(y1*x2-x1*y2)/(x2-x1);
	var D=C-b;
	Discr = (2.0*A*D-2.0*a)*(2.0*A*D-2.0*a) - 4.0*(1.0+A*A)*(a*a+D*D-r*r);
	var rootX1 = ( -(2.0*A*D-2.0*a) + Math.sqrt(Discr) )/(2.0*(1.0+A*A));
	var rootX2 = ( -(2.0*A*D-2.0*a) - Math.sqrt(Discr) )/(2.0*(1.0+A*A));

	var rootY1 = A*rootX1 + C;
	var rootY2 = A*rootX2 + C;

	return [rootX2, rootY2];
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

function LineHorizontIntersect(yhorizont, x1,y1,x2,y2)
{
    return (yhorizont-y1)/(y2-y1) * (x2-x1) + x1;
}


function BezierCubic(aptCP0, aptCP1, aptCP2, aptCP3, t)
{
    var ptNew = VectorMult(                 (1-t)*(1-t)*(1-t), aptCP0);
        ptNew = VectorAdd(ptNew,VectorMult(   3*t*(1-t)*(1-t), aptCP1));
        ptNew = VectorAdd(ptNew,VectorMult(   3*t*t*(1-t),     aptCP2));
        ptNew = VectorAdd(ptNew,VectorMult(   t*t*t,           aptCP3));

    return ptNew;
}


var EGUNHeight = 0;

function DrawGunElectrostatic()
{

var c = document.getElementById("FrontCanvas");
var ctx = c.getContext("2d");

	ctx._moveTo   = _moveTo; 
    ctx._lineTo   = _lineTo;
    ctx._fillText = _fillText;

	ctx.clearRect(0, 0, c.width, c.height);

	var el = document.getElementById("ElectrostaticTextArea");

/* #region GUI params */
	var CathR 		    = parseFloat(document.getElementById("CathR").value);
	var CathFocusR      = parseFloat(document.getElementById("CathFocusR").value);
	var CathSkirtR      = parseFloat(document.getElementById("CathSkirtR").value);
	var CathSkirtH      = parseFloat(document.getElementById("CathSkirtH").value);
	var CathSkirtA      = parseFloat(document.getElementById("CathSkirtA").value);
	var CathButtA       = parseFloat(document.getElementById("CathButtA").value);

	var AnodeCathGap 	= parseFloat(document.getElementById("AnodeCathGap").value);
	var AnodeInnerR  	= parseFloat(document.getElementById("AnodeInnerR").value);
	var AnodeRadialGap  = parseFloat(document.getElementById("AnodeRadialGap").value);
	var AnodeSaddleH	= parseFloat(document.getElementById("AnodeSaddleH").value);
	var AnodeCurvH   	= parseFloat(document.getElementById("AnodeCurvH").value);
	var AnodeNozzleR 	= parseFloat(document.getElementById("AnodeNozzleR").value);
	var AnodeNozzleH 	= parseFloat(document.getElementById("AnodeNozzleH").value);
	var AnodeNozzleThroatR   = parseFloat(document.getElementById("AnodeNozzleThroatR").value);
	var AnodeNozzleThroatH   = parseFloat(document.getElementById("AnodeNozzleThroatH").value);
	var AnodeNozzleDiffusorR = parseFloat(document.getElementById("AnodeNozzleDiffusorR").value);
	var AnodeNozzleDiffusorH = parseFloat(document.getElementById("AnodeNozzleDiffusorH").value);
	var CathDarkSpace 		 = parseFloat(document.getElementById("CathDarkSpace").value);
	var AccelerationVoltage  = parseFloat(document.getElementById("AccelerationVoltage").value);
	var SpaceCharge          = parseFloat(document.getElementById("SpaceCharge").value);
	var SpaceChargeGap       = parseFloat(document.getElementById("SpaceChargeGap").value);
/* #endregion */

/* #region Print Superfish 1st region params */
	el.value  = "Electrostatic problem\n";
	el.value += "Plate voltage -30kv\n";
	el.value += "[Originally appeared in 1987 User's Guide 10.8]\n";
	el.value += "\n";
	el.value += "&reg kprob=0,    ! Poisson or Pandira problem\n";
	el.value += "xjfact=0.0,      ! Electrostatic problem\n";
	el.value += "dx=0.02,         ! Mesh interval\n";
	el.value += "icylin=1,        ! Cylindrical symmetry\n";
	el.value += "nbsup=0,         ! Dirichlet boundary condition at upper edge\n";
	el.value += "nbslo=0,         ! Dirichlet boundary condition at lower edge\n";
	el.value += "nbsrt=0,         ! Dirichlet boundary condition at right edge\n";
	el.value += "nbslf=1,         ! Neumann boundary condition at left edge\n";
	el.value += "ltop=10 &        ! Maximum row number for field interpolation\n";
	el.value += "\n\n";
/* #endregion */

/* #region Superfish 1st region */
	ctx.strokeStyle = "black";
	ctx.lineWidth = 1;
	ctx.beginPath();
        ctx._moveTo(iOx,             0);       
        ctx._lineTo(RegionEStatic_W, 0);       
        ctx._lineTo(RegionEStatic_W, RegionEStatic_H);
        ctx._lineTo(iOx,             RegionEStatic_H);
        ctx._lineTo(iOx,             0);       
        el.value += "\n\n";

	ctx.fillStyle = "WhiteSmoke";
	ctx.fill();

	ctx.stroke();
/* #endregion */


var CathNettoH = 20;					// cathode netto height

var iH4 = CathNettoH + AnodeCathGap;	// anode edge left side height = cath + a/c gap (8)
var iH10= iH4 + AnodeCurvH;				// anode curvilinear height (28)
var iH9 = iH10+ AnodeNozzleH;			// anode nozzle height (6)
var iH8 = iH9 + AnodeNozzleThroatH;		// anode throat height (2)
var iH7 = iH8 + AnodeNozzleDiffusorH;	// anode diffusor = brutto height (7)

// initialize global param for the following magnetostatic problem
EGUNHeight = iH7;

var iH5 = iH4 + 16;						// anode upper cooler fin height
var iH6 = iH5 + 10;						// anode lower cooler fin height

var AnodeBruttoR = 60;					// anode brutto radius

var fStartAngle = Math.asin(CathR/CathFocusR);	// half angle of cathode
var gSphSegH = Math.sqrt( Math.pow(2*CathFocusR*Math.sin(fStartAngle/2), 2) - CathR*CathR ); // height of cathode sphere segment
var fFocusX = iOx;
var fFocusY = iOy + CathNettoH + CathFocusR - gSphSegH;

	document.getElementById("SFFocusX").value = fFocusX*fScaleSuperFish;
	document.getElementById("SFFocusY").value = (RegionEStatic_H*fScaleSuperFish - fFocusY*fScaleSuperFish).toPrecision(3);
	document.getElementById("SFBeamHalfAngle").value = fStartAngle.toPrecision(3);


/* #region Superfish 2nd region: CATHODE */

	el.value += "&reg mat=0,ibound=-1,voltage=-";
	el.value += AccelerationVoltage.toFixed(1);
	el.value += " &\n";

	ctx.strokeStyle = "black";
	ctx.lineWidth = 1;

	ctx.beginPath();
        ctx._moveTo(iOx,iOy);
        ctx._lineTo(iOx + CathR + CathSkirtR, iOy);
            
        // chamfering on the right
        var fButtThickness = CathSkirtR - CathSkirtH*Math.tan(deg2rad(90-CathSkirtA));
        var fChamferLeg = 0.5;
        // a*sin/sin/sqrt2, law of sines and rule of isosceles triangle
        var fCoef = fChamferLeg*Math.sin(deg2rad(180-CathButtA))/Math.sin(deg2rad(-45+CathButtA))/Math.sqrt(2);

        ctx._lineTo(iOx + CathR + CathSkirtR,         iOy + CathNettoH + CathSkirtH - fButtThickness*Math.tan(deg2rad(90-CathButtA) )-fChamferLeg);
        ctx._lineTo(iOx + CathR + CathSkirtR - fCoef, iOy + CathNettoH + CathSkirtH - fButtThickness*Math.tan(deg2rad(90-CathButtA)) -fChamferLeg + fCoef);

        ctx._lineTo(iOx + CathR + CathSkirtH*Math.tan(deg2rad(90-CathSkirtA)), iOy + CathNettoH + CathSkirtH);

        // position ourselves directly on the spherical part
        ctx._lineTo(iOx + CathR, iOy + CathNettoH); 

        // main surface
        for (var i = 1; i < 20; i++) {
            var xp = fFocusX + CathFocusR*Math.cos(Math.PI/2.0 - fStartAngle + i*fStartAngle/20);
            var yp = fFocusY - CathFocusR*Math.sin(Math.PI/2.0 - fStartAngle + i*fStartAngle/20);

            ctx._lineTo(xp, yp);
        }

        // position exactly on line of symmetry
        ctx._lineTo(iOx, fFocusY - CathFocusR);
        ctx._lineTo(iOx, iOy);
	ctx.stroke();

    // RIGHT
	ctx.beginPath();
        // position exactly on line of symmetry
        ctx._moveTo(iOx, iOy, false);
        ctx._lineTo(iOx, fFocusY - CathFocusR, false);

        // main surface
        for (var i = 21; i < 40; i++) {
            var xp = fFocusX + CathFocusR*Math.cos(Math.PI/2.0 - fStartAngle + i*fStartAngle/20);
            var yp = fFocusY - CathFocusR*Math.sin(Math.PI/2.0 - fStartAngle + i*fStartAngle/20);

            ctx._lineTo(xp, yp, false);
        }

        // position ourselves directly on the spherical part
        ctx._lineTo(iOx - CathR, iOy + CathNettoH, false);

        ctx._lineTo(iOx - CathR - CathSkirtH*Math.tan(deg2rad(90-CathSkirtA)), iOy + CathNettoH + CathSkirtH, false);

        // chamfering on the left
        ctx._lineTo(iOx - CathR - CathSkirtR + fCoef, iOy + CathNettoH + CathSkirtH - fButtThickness*Math.tan(deg2rad(90-CathButtA)) -fChamferLeg + fCoef, false);
        ctx._lineTo(iOx - CathR - CathSkirtR,         iOy + CathNettoH + CathSkirtH - fButtThickness*Math.tan(deg2rad(90-CathButtA)) -fChamferLeg, false);

        ctx._lineTo(iOx - CathR - CathSkirtR, iOy, false);
        ctx._lineTo(iOx,iOy, false);             


	//ctx.shadowBlur = 15;
	//ctx.shadowColor = "black";
	ctx.fillStyle = "SlateGray";
	ctx.fill();

	ctx.stroke();

/* #endregion */

/* #region Superfish 3d region: ANODE RIGHT */

	el.value += "\n\n&reg mat=0,ibound=-1,voltage=0.0 &\n";

	ctx.beginPath();
	ctx.lineWidth = 1;
        ctx._moveTo(iOx + AnodeBruttoR,                        iOy);                 
        ctx._lineTo(iOx + AnodeBruttoR,                        iOy + iH6);          
        ctx._lineTo(iOx + AnodeBruttoR,                        iOy + iH7);          
        ctx._lineTo(iOx + AnodeNozzleDiffusorR,                iOy + iH7);          
        ctx._lineTo(iOx + AnodeNozzleThroatR,                  iOy + iH8);          
        ctx._lineTo(iOx + AnodeNozzleThroatR,                  iOy + iH9);          
        ctx._lineTo(iOx + AnodeNozzleR,                        iOy + iH10);         
        ctx._lineTo(iOx + AnodeInnerR,                         iOy + CathNettoH + AnodeCathGap + AnodeSaddleH);         
        ctx._lineTo(iOx + CathR + CathSkirtR + AnodeRadialGap, iOy + CathNettoH + AnodeCathGap);
        ctx._lineTo(iOx + CathR + CathSkirtR + AnodeRadialGap, iOy);
        ctx._lineTo(iOx + AnodeBruttoR, iOy);

	ctx.stroke();

/* #endregion */

/* #region Superfish 3d region: ANODE LEFT */

	ctx.beginPath();
	ctx.lineWidth = 1;
        ctx._moveTo(iOx - AnodeBruttoR,                        iOy, false);                
        ctx._lineTo(iOx - AnodeBruttoR,                        iOy + iH6, false);          
        ctx._lineTo(iOx - AnodeBruttoR,                        iOy + iH7, false);          
        ctx._lineTo(iOx - AnodeNozzleDiffusorR,                iOy + iH7, false);          
        ctx._lineTo(iOx - AnodeNozzleThroatR,                  iOy + iH8, false);          
        ctx._lineTo(iOx - AnodeNozzleThroatR,                  iOy + iH9, false);          
        ctx._lineTo(iOx - AnodeNozzleR,                        iOy + iH10, false);         
        ctx._lineTo(iOx - AnodeInnerR,                         iOy + CathNettoH + AnodeCathGap + AnodeSaddleH, false);         
        ctx._lineTo(iOx - CathR - CathSkirtR - AnodeRadialGap, iOy + CathNettoH + AnodeCathGap, false);
        ctx._lineTo(iOx - CathR - CathSkirtR - AnodeRadialGap, iOy, false);
        ctx._lineTo(iOx - AnodeBruttoR,                        iOy, false);

	ctx.fillStyle = "BurlyWood";
	ctx.fill();

	ctx.stroke();

/* #endregion */

/* #region Superfish isolator right */

	// el.value += "\n\n&reg mat=0 &\n";

	// ctx.beginPath();
	// ctx._moveTo(iOx + 50, iOy);  			
	// ctx._lineTo(iOx + 50, iOy + 60); 
	// ctx._lineTo(iOx + 55, iOy + 60); 
	// ctx._lineTo(iOx + 55, iOy);            	
	// ctx._lineTo(iOx + 50, iOy);           	
	// // ctx._lineTo(iOx + iR7, iOy + iH7);            
	// // ctx._lineTo(iOx + iR8, iOy + iH8);            
	// // ctx._lineTo(iOx + iR8, iOy + iH9);            
	// // ctx._lineTo(iOx + iR9, iOy + iH10);           
	// // ctx._lineTo(iOx + AnodeInnerR - iRAnode, iOy + iH4);  

	// ctx.fillStyle = "Gold";
	// ctx.fill();

	// ctx.stroke();

/* #endregion */

/* #region Plasma */
    var iRPlasma = CathFocusR - AnodeCathGap - CathDarkSpace;

    el.value += "\n\n&reg mat=0,ibound=-1,voltage=-20.0 &\n";

    ctx.beginPath();

        // RIGHT (climbing up)
        ctx._moveTo(iOx + AnodeNozzleThroatR-1, iOy + iH9);          
        ctx._lineTo(iOx + AnodeNozzleR-1, iOy + iH10);         
        
        // Intermediate calculations:
        // circle with the center on the right cathode edge
        var inters = CircleLineIntersect(iOx + CathR,iOy + CathNettoH, AnodeCathGap + CathDarkSpace,
                                         iOx + AnodeNozzleR, iOy + iH10,
                                         iOx + AnodeInnerR, iOy + CathNettoH + AnodeCathGap + AnodeSaddleH);
        inters[0] = (iOx + CathR - inters[0]);
        inters[1] = Math.abs(iOy + CathNettoH - inters[1]);
        var fAngleInters = Math.atan2(inters[0],inters[1]);

        var cptR3 = [fFocusX,
                     fFocusY - iRPlasma];

        var intersXR2 = LineHorizontIntersect(cptR3[1],
                                              iOx + AnodeNozzleR, iOy + iH10,
                                              iOx + AnodeInnerR, iOy + CathNettoH + AnodeCathGap + AnodeSaddleH);
        var cptR2 = [ (fFocusX + intersXR2)/2.0, cptR3[1] ];

        var intersXR1 = LineHorizontIntersect(cptR3[1] -4,
                                              iOx + AnodeNozzleR, iOy + iH10,
                                              iOx + AnodeInnerR, iOy + CathNettoH + AnodeCathGap + AnodeSaddleH);
        var cptR0 = [intersXR1 -1, cptR3[1] -4];
        var cptR1 = [(fFocusX + intersXR1)/2.0, cptR3[1]];

        // right offset circle
        for (var i = 0; i <= 20; i++) {
            var ptBezier = BezierCubic(cptR0, cptR1, cptR2, cptR3, i/20 );
            var xp = ptBezier[0];
            var yp = ptBezier[1];

            ctx._lineTo(xp, yp);
        }

        ctx._lineTo(iOx, iOy + iH9);          
        ctx._lineTo(iOx + AnodeNozzleThroatR-1, iOy + iH9);
        
    ctx.stroke();


    // LEFT

    ctx.beginPath();

        // move exactly to the center
        ctx._moveTo(iOx, iOy + iH9, false);          

        // left offset circle
        var cptL3 = [fFocusX,
                     fFocusY - iRPlasma];

        var intersXL2 = LineHorizontIntersect(cptL3[1],
                                              iOx - AnodeNozzleR, iOy + iH10,
                                              iOx - AnodeInnerR, iOy + CathNettoH + AnodeCathGap + AnodeSaddleH);
        var cptL2 = [ (fFocusX + intersXL2)/2.0, cptL3[1] ];

        var intersXL1 = LineHorizontIntersect(cptL3[1] -4,
                                              iOx - AnodeNozzleR, iOy + iH10,
                                              iOx - AnodeInnerR, iOy + CathNettoH + AnodeCathGap + AnodeSaddleH);
        var cptL0 = [intersXL1 +1, cptL3[1] -4];
        var cptL1 = [(fFocusX + intersXL1)/2.0, cptL3[1]];


        for (var i = 20; i >= 0; i--) {
            var ptBezier = BezierCubic(cptL0, cptL1, cptL2, cptL3, i/20 );

            ctx._lineTo(ptBezier[0], ptBezier[1], false);
        }
        
        
        // left
        ctx._lineTo(iOx - AnodeNozzleR+1, iOy + iH10, false);         
        ctx._lineTo(iOx - AnodeNozzleThroatR+1, iOy + iH9, false);          

        ctx._lineTo(iOx, iOy + iH9, false);

        ctx.fillStyle = "Fuchsia";
        ctx.fill();
    ctx.stroke();

/* #endregion */

/* #region Space charge */
if (SpaceCharge != 0)
{
	el.value += "\n\n&reg mat=1,den=" + SpaceCharge;
	el.value += " &   ! DEN is charge density in Coul/cm^3\n";
    
    var SpaceChargeType = 1;
    switch (SpaceChargeType)
    {
        case 0: // staying inside cathode

            // RIGHT
            ctx.beginPath();

                ctx._moveTo(iOx + CathR + CathSkirtH*Math.tan(deg2rad(90-CathSkirtA))-1, iOy + CathNettoH + CathSkirtH);

                //main surface
                for (var i = 1; i < 10; i++) {
                    var xp = fFocusX + (CathFocusR-1)*Math.cos(Math.PI/2.0 - fStartAngle + i*fStartAngle/10);
                    var yp = fFocusY - (CathFocusR-1)*Math.sin(Math.PI/2.0 - fStartAngle + i*fStartAngle/10);

                    ctx._lineTo(xp, yp);
                }

                // position ourselves exaclty on the line of symmetry
                ctx._lineTo(iOx, fFocusY - (CathFocusR-1));
                ctx._lineTo(iOx, iOy + CathNettoH + CathSkirtH);
                ctx._lineTo(iOx + CathR + CathSkirtH*Math.tan(deg2rad(90-CathSkirtA))-1, iOy + CathNettoH + CathSkirtH);

            ctx.stroke();

            // LEFT
            ctx.beginPath();
                ctx._moveTo(iOx, iOy + CathNettoH + CathSkirtH, false);
                // position ourselves exaclty on the line of symmetry
                ctx._lineTo(iOx, fFocusY - (CathFocusR-1), false);
            
                //main surface
                for (var i = 11; i < 20; i++) {
                    var xp = fFocusX + (CathFocusR-1)*Math.cos(Math.PI/2.0 - fStartAngle + i*fStartAngle/10);
                    var yp = fFocusY - (CathFocusR-1)*Math.sin(Math.PI/2.0 - fStartAngle + i*fStartAngle/10);

                    ctx._lineTo(xp, yp, false);
                }

                ctx._lineTo(iOx - CathR - CathSkirtH*Math.tan(deg2rad(90-CathSkirtA))+1, iOy + CathNettoH + CathSkirtH, false);
                ctx._lineTo(iOx, iOy + CathNettoH + CathSkirtH, false);

            ctx.fillStyle = "Orange";
            ctx.fill();
            ctx.stroke();
            break;

        case 1: // filling the whole area between cathode and anode
        
            ctx.beginPath();
                // LEFT (do not change to right)
                
                // position exactly on the line
                ctx._moveTo(iOx, fFocusY - (CathFocusR-SpaceChargeGap), false);

                // cathode surface
                for (var i = 21; i <=40; i++) {
                    var xp = fFocusX + (CathFocusR-SpaceChargeGap)*Math.cos(Math.PI/2.0 - fStartAngle + i*fStartAngle/20);
                    var yp = fFocusY - (CathFocusR-SpaceChargeGap)*Math.sin(Math.PI/2.0 - fStartAngle + i*fStartAngle/20);

                    ctx._lineTo(xp, yp, false);
                }

                // plasma central circe
                cptL0[1] -= 1; cptL1[1] -= 1; cptL2[1] -= 1; cptL3[1] -= 1;
                for (var i = 0; i <=20; i++) {
                    var ptBezier = BezierCubic(cptL0, cptL1, cptL2, cptL3, i/20 );

                    ctx._lineTo( ptBezier[0], ptBezier[1], false);
                }

                ctx._lineTo(iOx, fFocusY - (CathFocusR-SpaceChargeGap), false);

            ctx.fillStyle = "Orange";
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
                ctx._moveTo(iOx, fFocusY - (CathFocusR-SpaceChargeGap));

                // plasma central circe

                cptR0[1] -= 1; cptR1[1] -= 1; cptR2[1] -= 1; cptR3[1] -= 1;
                for (var i = 20; i >= 0; i--) {
                    var ptBezier = BezierCubic(cptR0, cptR1, cptR2, cptR3, i/20 );
        
                    ctx._lineTo(ptBezier[0], ptBezier[1] );
                }

                // main surface
                for (var i = 0; i < 20; i++) {
                    var xp = fFocusX + (CathFocusR-SpaceChargeGap)*Math.cos(Math.PI/2.0 - fStartAngle + i*fStartAngle/20);
                    var yp = fFocusY - (CathFocusR-SpaceChargeGap)*Math.sin(Math.PI/2.0 - fStartAngle + i*fStartAngle/20);

                    ctx._lineTo(xp, yp);
                }
                
                ctx._lineTo(iOx, fFocusY - (CathFocusR-SpaceChargeGap));

            ctx.stroke();
        break;
    }

    // left
    // var xpPlasmaL = iOx - CathR + (AnodeCathGap + CathDarkSpace)*Math.cos(3*Math.PI/2.0 + (fAngleInters*(1.0-1/20) + fStartAngle*1/20));
    // var ypPlasmaL = iOy + CathNettoH - (AnodeCathGap + CathDarkSpace)*Math.sin(3*Math.PI/2.0 - (fAngleInters*(1.0-1/20) + fStartAngle*1/20));

    // //left
    // var xpCathL = fFocusX + CathFocusR*Math.cos(Math.PI/2.0 + fStartAngle);
    // var ypCathL = fFocusY - CathFocusR*Math.sin(Math.PI/2.0 + fStartAngle);

    // ctx._moveTo(LinearMix(xpCathL, xpPlasmaL, 0.85),
    // 			LinearMix(ypCathL, ypPlasmaL, 0.85)
    // );

    // // // left offset circle
    // for (var i = 1; i < 20; i++) {
    // 	var xp = iOx - CathR + (AnodeCathGap + CathDarkSpace)*Math.cos(3*Math.PI/2.0 + (fAngleInters*(1.0-i/20) + fStartAngle*i/20));
    // 	var yp = iOy + CathNettoH - (AnodeCathGap + CathDarkSpace)*Math.sin(3*Math.PI/2.0 - (fAngleInters*(1.0-i/20) + fStartAngle*i/20));

    // 	// prevent swallow tail formation
    // 	if (xp < 74) ctx._lineTo(xp, yp -1);
    // }	


    // // main plasma circe
    // if (iRPlasma > 2) {
    // 	for (var i = 19; i > 0; i--) {
    // 		var xp = fFocusX + iRPlasma*Math.cos(Math.PI/2.0 - fStartAngle + i*fStartAngle/10);
    // 		var yp = fFocusY - iRPlasma*Math.sin(Math.PI/2.0 - fStartAngle + i*fStartAngle/10);

    // 		ctx._lineTo(xp, yp-1);
    // 	}
    // }

    // // right offset circle
    // for (var i = 20-1; i > 0; i--) {
    // 	var xp = iOx + CathR + (AnodeCathGap + CathDarkSpace)*Math.cos(3*Math.PI/2.0 - (fAngleInters*(1.0-i/20) + fStartAngle*i/20));
    // 	var yp = iOy + CathNettoH - (AnodeCathGap + CathDarkSpace)*Math.sin(3*Math.PI/2.0 - (fAngleInters*(1.0-i/20) + fStartAngle*i/20));

    // 	// prevent swallow tail formation
    // 	if (xp > 76) ctx._lineTo(xp, yp-1);
    // }



    // // right
    // var xpPlasmaR = iOx + CathR + (AnodeCathGap + CathDarkSpace)*Math.cos(3*Math.PI/2.0 - (fAngleInters*(1.0-1/20) + fStartAngle*1/20));
    // var ypPlasmaR = iOy + CathNettoH - (AnodeCathGap + CathDarkSpace)*Math.sin(3*Math.PI/2.0 - (fAngleInters*(1.0-1/20) + fStartAngle*1/20));

    // // right
    // var xpCathR = fFocusX + CathFocusR*Math.cos(Math.PI/2.0 - fStartAngle);
    // var ypCathR = fFocusY - CathFocusR*Math.sin(Math.PI/2.0 - fStartAngle);
                
    // ctx._lineTo(LinearMix(xpCathR, xpPlasmaR, 0.85),
    // 			LinearMix(ypCathR, ypPlasmaR, 0.85)
    // );

    // ctx._lineTo(iOx,
    // 			LinearMix(iOy + CathNettoH - gSphSegH, iOy + CathNettoH - gSphSegH + CathFocusR, 0.5)
    // );

    // ctx._lineTo(LinearMix(xpCathL, xpPlasmaL, 0.85),
    // 			LinearMix(ypCathL, ypPlasmaL, 0.85)
    // );

    // // ctx._lineTo(fFocusX + (CathFocusR-1)*Math.cos(Math.PI/2.0 - fStartAngle),
    // // 			fFocusY - (CathFocusR-1)*Math.sin(Math.PI/2.0 - fStartAngle) );

}
/* #endregion */

/* #region DrawFocalPlaneBunker */
const FocalPlane  = 135+12+12+250;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.beginPath();
		ctx._moveTo( iOx-60, iOy + EGUNHeight + FocalPlane, false);
		ctx._lineTo( iOx+60, iOy + EGUNHeight + FocalPlane, false);
    ctx.stroke();

    ctx.beginPath();
        ctx._moveTo( iOx-60, iOy + EGUNHeight + FocalPlane -10, false);
        ctx._lineTo( iOx-60, iOy + EGUNHeight + FocalPlane +10, false);
    ctx.stroke();

    ctx.beginPath();
        ctx._moveTo( iOx+60, iOy + EGUNHeight + FocalPlane -10, false);
        ctx._lineTo( iOx+60, iOy + EGUNHeight + FocalPlane +10, false);
    ctx.stroke();

    ctx.fillStyle = "black";
	ctx.font = '16px "Comic Sans"';
	ctx._fillText('409mm', (iOx+62), (iOy + EGUNHeight + FocalPlane));
/* #endregion */

/* #region DrawPaschenValuesOnTheImage */

	const Pressure2_5Pa  = 0.01875;
	const Pressure5Pa    = 0.0375;
    const Pressure10Pa   = 0.075;

    const PdAr2kv  = 0.15;
    const PdAr10kv = 0.118;
    const PdAr30kv = 0.092;

    const PdNe2kv  = 0.65;
    const PdNe10kv = 0.31;
    const PdNe30kv = 0.22;

    const PdH2kv   = 0.71;  // 0.35 
    const PdH10kv  = 0.51; // 0.27
    const PdH30kv  = 0.45; // 0.22
    
	// Legend
    ctx.lineWidth = 10;
    ctx.strokeStyle = "red";
    ctx.beginPath();
        ctx._moveTo( iOx-69, iOy + CathNettoH + 4, false);
        ctx._lineTo( iOx-72, iOy + CathNettoH + 4, false);
    ctx.stroke();
    ctx.strokeStyle = "green";
    ctx.beginPath();
        ctx._moveTo( iOx-69, iOy + CathNettoH + 9, false);
        ctx._lineTo( iOx-72, iOy + CathNettoH + 9, false);
    ctx.stroke();    
    ctx.strokeStyle = "blue";
    ctx.beginPath();
        ctx._moveTo( iOx-69, iOy + CathNettoH + 14, false);
        ctx._lineTo( iOx-72, iOy + CathNettoH + 14, false);
	ctx.stroke();
	
	ctx.fillStyle = "black";
	ctx.font = '14px "Comic Sans"';
	ctx._fillText('30kv', (iOx-68), (iOy + CathNettoH + 5));
    ctx._fillText('10kv', (iOx-68), (iOy + CathNettoH + 10));
	ctx._fillText('2kv',  (iOx-68), (iOy + CathNettoH + 15));
	
	// Column captions
	ctx.fillStyle = "Black";
	ctx.font = '14px "Comic Sans"';

	ctx._fillText('Ar(40)', 17, (iOy + 16));
 	ctx._fillText('N\u2082(28)', 17, (iOy + 12));
	ctx._fillText('Air', 17, (iOy + 8));

    ctx._fillText('Ne(20)', 28, (iOy + 16));

	ctx._fillText('H\u2082(2)', 39, (iOy + 16));

	// 30kv
	ctx.font = '12px "Comic Sans"';
	ctx.fillStyle = "red";
	ctx._fillText(PdToP(PdAr30kv, AnodeCathGap + CathDarkSpace) + 'Pa', 17, (iOy + CathNettoH + 5));
	ctx._fillText(PdToP(PdNe30kv, AnodeCathGap + CathDarkSpace) + 'Pa', 28, (iOy + CathNettoH + 5));
	ctx._fillText(PdToP(PdH30kv,  AnodeCathGap + CathDarkSpace) + 'Pa', 39, (iOy + CathNettoH + 5));

	// 10kv
	ctx.font = '12px "Comic Sans"';
	ctx.fillStyle = "green";
	ctx._fillText(PdToP(PdAr10kv, AnodeCathGap + CathDarkSpace) + 'Pa', 17, (iOy + CathNettoH + 10));
	ctx._fillText(PdToP(PdNe10kv, AnodeCathGap + CathDarkSpace) + 'Pa', 28, (iOy + CathNettoH + 10));
	ctx._fillText(PdToP(PdH10kv,  AnodeCathGap + CathDarkSpace) + 'Pa', 39, (iOy + CathNettoH + 10));
	
	// 2kv
	ctx.font = '12px "Comic Sans"';
	ctx.fillStyle = "blue";
	ctx._fillText(PdToP(PdAr2kv, AnodeCathGap + CathDarkSpace) + 'Pa', 17, (iOy + CathNettoH + 15));
	ctx._fillText(PdToP(PdNe2kv, AnodeCathGap + CathDarkSpace) + 'Pa', 28, (iOy + CathNettoH + 15));
	ctx._fillText(PdToP(PdH2kv,  AnodeCathGap + CathDarkSpace) + 'Pa', 39, (iOy + CathNettoH + 15));
/* #endregion */

/* #region GUI cathode focus */
	ctx.fillStyle = "black";
	ctx.lineWidth = 1;
    ctx.beginPath();
		ctx.lineWidth = 0.5;
		ctx._moveTo( fFocusX + CathR, iOy + CathNettoH, false);
		ctx._lineTo( fFocusX,       fFocusY, false);
	ctx.stroke();

	ctx.beginPath();
		ctx.lineWidth = 0.5;
		ctx._moveTo( fFocusX - CathR, iOy + CathNettoH, false);
		ctx._lineTo( fFocusX,       fFocusY, false);
	ctx.stroke();

	ctx.font = "16px Georgia";
	ctx._fillText("th= " + rad2deg(2.0*fStartAngle).toPrecision(3) + String.fromCharCode(176),
                 (fFocusX - 6), (fFocusY - 6));
                
    ctx.font = "14px Georgia";
    ctx._fillText("SphSegH= " + gSphSegH.toPrecision(2) + " mm",
                 (iOx-16), (iOy + 4));
    ctx.font = "14px Georgia";
    ctx._fillText("SphSegH= " + (2.0*Math.PI*CathFocusR*gSphSegH/100.0).toPrecision(2) + " cm\u00B2",
                 (iOx-16), (iOy + 8));

/* #endregion */


}

//44-(0.45*(44-8)*x*x)/(85*(85-x*(1-0.45)))

var fScaleSuperFish = 0.1;		// SF needs cms
var fScaleGUI       = 3.8;	

var RegionEStatic_W = 150; 		// mm
var RegionEStatic_H = 150;		// mm

var iOx = 75;					// mm
var iOy = 10;					// mm

function rad2deg(radians)
{
  var pi = Math.PI;
  return radians * (180/pi);
}

function PrintSuperFishXY(x, y)
{
var el = document.getElementById("ElectrostaticTextArea");
	el.value += "&po x=" + x.toPrecision(4) + "," + "y=" + (RegionEStatic_H*fScaleSuperFish - y).toPrecision(4) + " &\r\n";
}

function _moveTo(x,y, sf_output = true) {
	this.moveTo(x*fScaleGUI, y*fScaleGUI);										// GUI
	
	if (sf_output) PrintSuperFishXY(x*fScaleSuperFish, y*fScaleSuperFish);		// SuperFish
}

function _lineTo(x,y, sf_output = true) {
	this.lineTo(x*fScaleGUI, y*fScaleGUI);										// GUI
	
	if (sf_output) PrintSuperFishXY(x*fScaleSuperFish,y*fScaleSuperFish);       // SuperFish
}


function CircleLineIntersect(xr,yr,r, x1,y1,x2,y2)
{
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


var EGUNHeight = 0;

function DrawGunElectrostatic()
{

var c = document.getElementById("myCanvas");
var ctx = c.getContext("2d");

	ctx._moveTo = _moveTo; 
	ctx._lineTo = _lineTo;

	ctx.clearRect(0, 0, c.width, c.height);

	var el = document.getElementById("ElectrostaticTextArea");

/* #region GUI params */
	var CathR 		 = parseFloat(document.getElementById("CathR").value);
	var CathSkirtR   = parseFloat(document.getElementById("CathSkirtR").value);
	var CathSkirtH   = parseFloat(document.getElementById("CathSkirtH").value);
	var CathSkirtA   = parseFloat(document.getElementById("CathSkirtA").value)/10.0;
	var CathFocusR   = parseFloat(document.getElementById("CathFocusR").value);

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
/* #endregion */

/* #region Print Superfish 1st region params */
	el.value  = "Electrostatic problem\n";
	el.value += "Plate voltage -30kv\n";
	el.value += "[Originally appeared in 1987 User's Guide 10.8]\n";
	el.value += "\n";
	el.value += "&reg kprob=0,    ! Poisson or Pandira problem\n";
	el.value += "xjfact=0.0,      ! Electrostatic problem\n";
	el.value += "dx=0.02,         ! Mesh interval\n";
	el.value += "icylin=0,        ! Cartesian coordinates\n";
	el.value += "nbsup=0,         ! Dirichlet boundary condition at upper edge\n";
	el.value += "nbslo=0,         ! Dirichlet boundary condition at lower edge\n";
	el.value += "nbsrt=0,         ! Dirichlet boundary condition at right edge\n";
	el.value += "nbslf=0,         ! Dirichlet boundary condition at left edge\n";
	el.value += "ltop=10 &        ! Maximum row number for field interpolation\n";
	el.value += "\n\n";
/* #endregion */

/* #region Superfish 1st region */
	ctx.strokeStyle = "black";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx._moveTo(0,               0);       
	ctx._lineTo(RegionEStatic_W, 0);       
	ctx._lineTo(RegionEStatic_W, RegionEStatic_H);
	ctx._lineTo(0,               RegionEStatic_H);
	ctx._lineTo(0,               0);       
	el.value += "\n\n";

	ctx.fillStyle = "WhiteSmoke";
	ctx.fill();

	ctx.stroke();
/* #endregion */


var iH3 = 20;			// cathode netto height

var iR3 = CathR;		// cathode radius (20)
var iR0 = CathSkirtR;   // the radius of stainless steel skirt
// CathSkirtH;          // the height of stainless steel skirt
// CathSkirtA;          // the angle of stainless steel skirt

var iRFocus = CathFocusR;

var iH4 = iH3 + AnodeCathGap;			// anode edge left side height = cath + a/c gap (8)
var iH10= iH4 + AnodeCurvH;				// anode curvilinear height (28)
var iH9 = iH10+ AnodeNozzleH;			// anode nozzle height (6)
var iH8 = iH9 + AnodeNozzleThroatH;		// anode throat height (2)
var iH7 = iH8 + AnodeNozzleDiffusorH;	// anode diffusor = brutto height (7)

// initialize global param for the following magnetostatic problem
EGUNHeight = iH7;

var iH5 = iH4 + 16;						// anode upper cooler fin height
var iH6 = iH5 + 10;						// anode lower cooler fin height

var iR4 = AnodeInnerR;					// anode edge inner radius (23)
var iR5 = 40;							// external cooler fin radius
var iR6 = 60;							// anode brutto radius
var iR7 = AnodeNozzleDiffusorR;			// anode diffuser radius (13)
var iR8 = AnodeNozzleThroatR;			// anode throat radius (6)
var iR9 = AnodeNozzleR;					// anode nozzle radius (12)

var fStartAngle = Math.asin(iR3/iRFocus);	// half angle of cathode
var gSphSegH = Math.sqrt( Math.pow(2*iRFocus*Math.sin(fStartAngle/2), 2) - iR3*iR3 ); // height of cathode sphere segment
var fFocusX = iOx;
var fFocusY = iOy + iH3 + iRFocus - gSphSegH;

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
	ctx._lineTo(iOx + iR3 + iR0, iOy); 
	ctx._lineTo(iOx + iR3 + iR0, iOy + iH3 - iR0 + CathSkirtH); 

	// rounding on the right
	for (var i = 1; i < CathSkirtA + 1; i++) {
		var xp = iOx + iR3 + iR0*Math.cos(i*(Math.PI/2.0)/9);
		var yp = iOy + iH3 - iR0 + CathSkirtH + iR0*Math.sin(i*(Math.PI/2.0)/9);	// fixed step not to abuse triangle grid

		ctx._lineTo(xp, yp);
	}

	ctx._lineTo(iOx + iR3, iOy + iH3); 

	// main surface
	for (var i = 1; i < 40; i++) {
		var xp = fFocusX + iRFocus*Math.cos(Math.PI/2.0 - fStartAngle + i*fStartAngle/20);
		var yp = fFocusY - iRFocus*Math.sin(Math.PI/2.0 - fStartAngle + i*fStartAngle/20);

		ctx._lineTo(xp, yp);
	}

	ctx._lineTo(iOx - iR3, iOy + iH3); 

	// rounding on the left
	for (var i = 9-CathSkirtA; i < 9; i++) {
		var xp = iOx - iR3 + iR0*Math.cos(Math.PI/2.0 + i*(Math.PI/2.0)/9);
		var yp = iOy + iH3 - iR0  + CathSkirtH + iR0*Math.sin(Math.PI/2.0 + i*(Math.PI/2.0)/9);

		ctx._lineTo(xp, yp);
	}

	ctx._lineTo(iOx - iR3 - iR0, iOy + iH3 - iR0 + CathSkirtH);
	ctx._lineTo(iOx - iR3 - iR0, iOy);
	ctx._lineTo(iOx,iOy);             


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
	ctx._moveTo(iOx + iR6, iOy);                 
	ctx._lineTo(iOx + iR6, iOy + iH6);          
	ctx._lineTo(iOx + iR6, iOy + iH7);          
	ctx._lineTo(iOx + iR7, iOy + iH7);          
	ctx._lineTo(iOx + iR8, iOy + iH8);          
	ctx._lineTo(iOx + iR8, iOy + iH9);          
	ctx._lineTo(iOx + iR9, iOy + iH10);         
	ctx._lineTo(iOx + iR4, iOy + iH3 + AnodeCathGap + AnodeSaddleH);         
	ctx._lineTo(iOx + iR3 + iR0 + AnodeRadialGap, iOy + iH3 + AnodeCathGap);
	ctx._lineTo(iOx + iR3 + iR0 + AnodeRadialGap, iOy);
	ctx._lineTo(iOx + iR6, iOy);

	ctx.fillStyle = "BurlyWood";
	ctx.fill();

	ctx.stroke();

/* #endregion */

/* #region Superfish 3d region: ANODE LEFT */
	el.value += "\n\n&reg mat=0,ibound=-1,voltage=0.0 &\n";

	ctx.beginPath();
	ctx.lineWidth = 1;
	ctx._moveTo(iOx - iR6, iOy);                
	ctx._lineTo(iOx - iR6, iOy + iH6);          
	ctx._lineTo(iOx - iR6, iOy + iH7);          
	ctx._lineTo(iOx - iR7, iOy + iH7);          
	ctx._lineTo(iOx - iR8, iOy + iH8);          
	ctx._lineTo(iOx - iR8, iOy + iH9);          
	ctx._lineTo(iOx - iR9, iOy + iH10);         
	ctx._lineTo(iOx - iR4, iOy + iH3 + AnodeCathGap + AnodeSaddleH);         
	ctx._lineTo(iOx - iR3 - iR0 - AnodeRadialGap, iOy + iH3 + AnodeCathGap);
	ctx._lineTo(iOx - iR3 - iR0 - AnodeRadialGap, iOy);
	ctx._lineTo(iOx - iR6, iOy);

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
	// // ctx._lineTo(iOx + iR4 - iRAnode, iOy + iH4);  

	// ctx.fillStyle = "Gold";
	// ctx.fill();

	// ctx.stroke();

/* #endregion */

/* #region Plasma */
var iRPlasma = CathFocusR - AnodeCathGap - CathDarkSpace;

el.value += "\n\n&reg mat=0,ibound=-1,voltage=-20.0 &\n";

ctx.beginPath();
	ctx._lineTo(iOx + iR8-1, iOy + iH9);          
	ctx._lineTo(iOx + iR9-1, iOy + iH10);         
	//ctx._lineTo(iOx + iR4 - iRAnode-10, iOy + iH4);

	
	// circle with the center on the right cathode edge
	var inters = CircleLineIntersect(iOx + iR3,iOy + iH3, AnodeCathGap + CathDarkSpace,
			 						 iOx + iR9, iOy + iH10,
									 iOx + iR4, iOy + iH3 + AnodeCathGap + AnodeSaddleH);
	inters[0] = (iOx + iR3 - inters[0]);
	inters[1] = Math.abs(iOy + iH3 - inters[1]);
	var fAngleInters = Math.atan2(inters[0],inters[1]);

	// right offset circle
	for (var i = 1; i < 10; i++) {
		var xp = iOx + iR3 + (AnodeCathGap + CathDarkSpace)*Math.cos(3*Math.PI/2.0 - (fAngleInters*(1.0-i/10) + fStartAngle*i/10));
		var yp = iOy + iH3 - (AnodeCathGap + CathDarkSpace)*Math.sin(3*Math.PI/2.0 - (fAngleInters*(1.0-i/10) + fStartAngle*i/10));

        // draw only until circle stays on one half of the plane (handling situation when CDSpace is larger than radius)
        if (xp > 76) ctx._lineTo(xp, yp);
	}
	
    // main plasma circe

    // (handling situation when CDSpace is larger than radius)
    if (iRPlasma > 2) {
        for (var i = 1; i < 20; i++) {
            var xp = fFocusX + iRPlasma*Math.cos(Math.PI/2.0 - fStartAngle + i*fStartAngle/10);
            var yp = fFocusY - iRPlasma*Math.sin(Math.PI/2.0 - fStartAngle + i*fStartAngle/10);

            ctx._lineTo(xp, yp);
        }
    }
	// left offset circle
	for (var i = 10-1; i > 0; i--) {
		var xp = iOx - iR3 + (AnodeCathGap + CathDarkSpace)*Math.cos(3*Math.PI/2.0 + (fAngleInters*(1.0-i/10) + fStartAngle*i/10));
		var yp = iOy + iH3 - (AnodeCathGap + CathDarkSpace)*Math.sin(3*Math.PI/2.0 - (fAngleInters*(1.0-i/10) + fStartAngle*i/10));
	
        // draw only until circle stays on one half of the plane (handling situation when CDSpace is larger than radius)
        if (xp < 74) ctx._lineTo(xp, yp);
	}
	
	
	// left
	//ctx._lineTo(iOx - iR4 + iRAnode+10, iOy + iH4);
	ctx._lineTo(iOx - iR9+1, iOy + iH10);         
	ctx._lineTo(iOx - iR8+1, iOy + iH9);          

	ctx._lineTo(iOx + iR8-1, iOy + iH9);

	ctx.fillStyle = "Fuchsia";
	ctx.fill();
ctx.stroke();

/* #endregion */

/* #region Space charge */
el.value += "\n\n&reg mat=1,den=" + SpaceCharge;
el.value += " &   ! DEN is charge density in Coul/cm^3\n";

ctx.beginPath();
	ctx._lineTo(iOx + iR3 + iR0*Math.cos(CathSkirtA *(Math.PI/2.0)/9) - 1,
	            iOy + iH3 - iR0 + CathSkirtH + iR0*Math.sin(CathSkirtA *(Math.PI/2.0)/9) );

	//ctx._lineTo(iOx + iR3 - 1, iOy + iH3 + 1); 

	// main surface
	for (var i = 0; i <= 40; i++) {
		var xp = fFocusX + (iRFocus-1)*Math.cos(Math.PI/2.0 - fStartAngle + i*fStartAngle/20);
		var yp = fFocusY - (iRFocus-1)*Math.sin(Math.PI/2.0 - fStartAngle + i*fStartAngle/20);

		ctx._lineTo(xp, yp);
	}

	//ctx._lineTo(iOx - iR3 + 1, iOy + iH3 + 1); 



	ctx._lineTo(iOx - iR3 + iR0*Math.cos(Math.PI/2.0 + (9-CathSkirtA)*(Math.PI/2.0)/9) + 1,
				iOy + iH3 - iR0  + CathSkirtH + iR0*Math.sin(Math.PI/2.0 + (9-CathSkirtA)*(Math.PI/2.0)/9));



	// left offset circle
	for (var i = 1; i < 10; i++) {
		var xp = iOx - iR3 + (AnodeCathGap + CathDarkSpace)*Math.cos(3*Math.PI/2.0 + (fAngleInters*(1.0-i/10) + fStartAngle*i/10));
		var yp = iOy + iH3 - (AnodeCathGap + CathDarkSpace)*Math.sin(3*Math.PI/2.0 - (fAngleInters*(1.0-i/10) + fStartAngle*i/10));

		if (xp < 74) ctx._lineTo(xp, yp -1);
	}	


    // main plasma circe
    if (iRPlasma > 2) {
        for (var i = 19; i > 0; i--) {
            var xp = fFocusX + iRPlasma*Math.cos(Math.PI/2.0 - fStartAngle + i*fStartAngle/10);
            var yp = fFocusY - iRPlasma*Math.sin(Math.PI/2.0 - fStartAngle + i*fStartAngle/10);

            ctx._lineTo(xp, yp-1);
        }
    }

	// right offset circle
	for (var i = 9; i > 0; i--) {
		var xp = iOx + iR3 + (AnodeCathGap + CathDarkSpace)*Math.cos(3*Math.PI/2.0 - (fAngleInters*(1.0-i/10) + fStartAngle*i/10));
		var yp = iOy + iH3 - (AnodeCathGap + CathDarkSpace)*Math.sin(3*Math.PI/2.0 - (fAngleInters*(1.0-i/10) + fStartAngle*i/10));

		if (xp > 76) ctx._lineTo(xp, yp-1);
	}

	ctx._lineTo(iOx + iR3 + iR0*Math.cos(CathSkirtA *(Math.PI/2.0)/9)-1,
				iOy + iH3 - iR0 + CathSkirtH + iR0*Math.sin(CathSkirtA *(Math.PI/2.0)/9) );


	ctx.fillStyle = "Orange";
	ctx.fill();
ctx.stroke();

/* #endregion */


/* #region DrawPaschenValuesOnTheImage */

	const Pressure2_5Pa  = 0.01875;
	const Pressure5Pa  = 0.0375;
    const Pressure10Pa = 0.075;

    const PdAr2kv  = 0.15;
    const PdAr10kv = 0.118;
    const PdAr30kv = 0.092;

    const PdNe2kv  = 0.3;
    const PdNe10kv = 0.18;
    const PdNe30kv = 0.15;

    const PdH2kv  = 0.417;
    const PdH10kv = 0.313;
    const PdH30kv = 0.235;

	// Ar
	ctx.lineWidth = 6;
    ctx.strokeStyle = "blue";
    ctx.beginPath();
		ctx._moveTo( iOx-55, iOy + iH3 + 10.0*PdAr2kv/Pressure5Pa, false);
		ctx._lineTo( iOx-55, iOy + iH3 + 10.0*PdAr2kv/Pressure10Pa, false);
    ctx.stroke();
    ctx.strokeStyle = "green";
    ctx.beginPath();
		ctx._moveTo( iOx-53, iOy + iH3 + 10.0*PdAr10kv/Pressure5Pa, false);
		ctx._lineTo( iOx-53, iOy + iH3 + 10.0*PdAr10kv/Pressure10Pa, false);
    ctx.stroke();    
    ctx.strokeStyle = "red";
    ctx.beginPath();
        ctx._moveTo( iOx-51, iOy + iH3 + 10.0*PdAr30kv/Pressure5Pa, false);
        ctx._lineTo( iOx-51, iOy + iH3 + 10.0*PdAr30kv/Pressure10Pa, false);
	ctx.stroke();
	
	ctx.lineWidth = 4;
    ctx.strokeStyle = "blue";
    ctx.beginPath();
		ctx._moveTo( iOx-55, iOy + iH3 + 10.0*PdAr2kv/Pressure2_5Pa, false);
		ctx._lineTo( iOx-55, iOy + iH3 + 10.0*PdAr2kv/Pressure5Pa +1, false);
    ctx.stroke();
    ctx.strokeStyle = "green";
    ctx.beginPath();
		ctx._moveTo( iOx-53, iOy + iH3 + 10.0*PdAr10kv/Pressure2_5Pa, false);
		ctx._lineTo( iOx-53, iOy + iH3 + 10.0*PdAr10kv/Pressure5Pa +1, false);
    ctx.stroke();    
    ctx.strokeStyle = "red";
    ctx.beginPath();
        ctx._moveTo( iOx-51, iOy + iH3 + 10.0*PdAr30kv/Pressure2_5Pa, false);
        ctx._lineTo( iOx-51, iOy + iH3 + 10.0*PdAr30kv/Pressure5Pa +1, false);
    ctx.stroke();

	// Ne
	ctx.strokeStyle = "blue";
	ctx.lineWidth = 6;
    ctx.beginPath();
        ctx._moveTo( iOx-44, iOy + iH3 + 10.0*PdNe2kv/Pressure5Pa, false);
        ctx._lineTo( iOx-44, iOy + iH3 + 10.0*PdNe2kv/Pressure10Pa, false);
    ctx.stroke();
    ctx.strokeStyle = "green";
    ctx.beginPath();
        ctx._moveTo( iOx-42, iOy + iH3 + 10.0*PdNe10kv/Pressure5Pa, false);
        ctx._lineTo( iOx-42, iOy + iH3 + 10.0*PdNe10kv/Pressure10Pa, false);
    ctx.stroke();    
    ctx.strokeStyle = "red";
    ctx.beginPath();
        ctx._moveTo( iOx-40, iOy + iH3 + 10.0*PdNe30kv/Pressure5Pa, false);
        ctx._lineTo( iOx-40, iOy + iH3 + 10.0*PdNe30kv/Pressure10Pa, false);
	ctx.stroke();
	
	ctx.lineWidth = 4;
    ctx.strokeStyle = "blue";
    ctx.beginPath();
		ctx._moveTo( iOx-44, iOy + iH3 + 10.0*PdNe2kv/Pressure2_5Pa, false);
		ctx._lineTo( iOx-44, iOy + iH3 + 10.0*PdNe2kv/Pressure5Pa +1, false);
    ctx.stroke();
    ctx.strokeStyle = "green";
    ctx.beginPath();
		ctx._moveTo( iOx-42, iOy + iH3 + 10.0*PdNe10kv/Pressure2_5Pa, false);
		ctx._lineTo( iOx-42, iOy + iH3 + 10.0*PdNe10kv/Pressure5Pa +1, false);
    ctx.stroke();    
    ctx.strokeStyle = "red";
    ctx.beginPath();
        ctx._moveTo( iOx-40, iOy + iH3 + 10.0*PdNe30kv/Pressure2_5Pa, false);
        ctx._lineTo( iOx-40, iOy + iH3 + 10.0*PdNe30kv/Pressure5Pa +1, false);
    ctx.stroke();

	// H2
	ctx.strokeStyle = "blue";
	ctx.lineWidth = 6;
    ctx.beginPath();
        ctx._moveTo( iOx-33, iOy + iH3 + 10.0*PdH2kv/Pressure5Pa, false);
        ctx._lineTo( iOx-33, iOy + iH3 + 10.0*PdH2kv/Pressure10Pa, false);
    ctx.stroke();
    ctx.strokeStyle = "green";
    ctx.beginPath();
        ctx._moveTo( iOx-31, iOy + iH3 + 10.0*PdH10kv/Pressure5Pa, false);
        ctx._lineTo( iOx-31, iOy + iH3 + 10.0*PdH10kv/Pressure10Pa, false);
    ctx.stroke();    
    ctx.strokeStyle = "red";
    ctx.beginPath();
        ctx._moveTo( iOx-29, iOy + iH3 + 10.0*PdH30kv/Pressure5Pa, false);
        ctx._lineTo( iOx-29, iOy + iH3 + 10.0*PdH30kv/Pressure10Pa, false);
    ctx.stroke();
    
	// Legend
    ctx.lineWidth = 10;
    ctx.strokeStyle = "red";
    ctx.beginPath();
        ctx._moveTo( iOx-69, iOy + iH3 + 20, false);
        ctx._lineTo( iOx-72, iOy + iH3 + 20, false);
    ctx.stroke();
    ctx.strokeStyle = "green";
    ctx.beginPath();
        ctx._moveTo( iOx-69, iOy + iH3 + 25, false);
        ctx._lineTo( iOx-72, iOy + iH3 + 25, false);
    ctx.stroke();    
    ctx.strokeStyle = "blue";
    ctx.beginPath();
        ctx._moveTo( iOx-69, iOy + iH3 + 30, false);
        ctx._lineTo( iOx-72, iOy + iH3 + 30, false);
	ctx.stroke();
	
	ctx.fillStyle = "black";
	ctx.font = '14px "Comic Sans"';
	ctx.fillText('30kv', (iOx-68)*fScaleGUI, (iOy + iH3 + 21)*fScaleGUI);
    ctx.fillText('10kv', (iOx-68)*fScaleGUI, (iOy + iH3 + 26)*fScaleGUI);
	ctx.fillText('2kv',  (iOx-68)*fScaleGUI, (iOy + iH3 + 31)*fScaleGUI);
	
	// Column captions
	ctx.fillStyle = "Black";
	ctx.font = '16px "Comic Sans"';

	ctx.fillText('Ar(40)', 17*fScaleGUI, (iOy + iH3 + 10.0*PdAr30kv/Pressure10Pa - 16)*fScaleGUI);
 	ctx.fillText('N\u2082(28)', 17*fScaleGUI, (iOy + iH3 + 10.0*PdAr30kv/Pressure10Pa - 12)*fScaleGUI);
	ctx.fillText('Air', 17*fScaleGUI, (iOy + iH3 + 10.0*PdAr30kv/Pressure10Pa - 8)*fScaleGUI);
	 
	ctx.fillText('Ne(20)', 28*fScaleGUI, (iOy + iH3 + 10.0*PdNe30kv/Pressure10Pa - 8)*fScaleGUI);
	ctx.fillText('H\u2082(2)', 39*fScaleGUI, (iOy + iH3 + 10.0*PdH30kv/Pressure10Pa - 8)*fScaleGUI);
	
	// Min/max markings
	ctx.font = '12px "Comic Sans"';
	ctx.fillStyle = "black";

	ctx.fillText('2.5Pa', 15*fScaleGUI, (iOy + iH3 + 10.0*PdAr2kv/Pressure2_5Pa + 5)*fScaleGUI);
	ctx.fillText('2.5Pa', 26*fScaleGUI, (iOy + iH3 + 10.0*PdNe2kv/Pressure2_5Pa + 5)*fScaleGUI);
	//ctx.fillText('2.5Pa', 37*fScaleGUI, (iOy + iH3 + 10.0*PdH2kv/Pressure2_5Pa  + 5)*fScaleGUI);

	ctx.fillText('5Pa', 15*fScaleGUI, (iOy + iH3 + 10.0*PdAr2kv/Pressure5Pa + 5)*fScaleGUI);
	ctx.fillText('5Pa', 26*fScaleGUI, (iOy + iH3 + 10.0*PdNe2kv/Pressure5Pa + 5)*fScaleGUI);
	ctx.fillText('5Pa', 37*fScaleGUI, (iOy + iH3 + 10.0*PdH2kv/Pressure5Pa  + 5)*fScaleGUI);

	ctx.fillText('10Pa', 18*fScaleGUI, (iOy + iH3 + 10.0*PdAr30kv/Pressure10Pa - 3)*fScaleGUI);
	ctx.fillText('10Pa', 29*fScaleGUI, (iOy + iH3 + 10.0*PdNe30kv/Pressure10Pa - 3)*fScaleGUI);
	ctx.fillText('10Pa', 40*fScaleGUI, (iOy + iH3 + 10.0*PdH30kv/Pressure10Pa  - 3)*fScaleGUI);
	
/* #endregion */

/* #region GUI cathode focus */
	ctx.fillStyle = "black";
	ctx.lineWidth = 1;
    ctx.beginPath();
		ctx.lineWidth = 0.5;
		ctx._moveTo( fFocusX + iR3, iOy + iH3, false);
		ctx._lineTo( fFocusX,       fFocusY, false);
	ctx.stroke();

	ctx.beginPath();
		ctx.lineWidth = 0.5;
		ctx._moveTo( fFocusX - iR3, iOy + iH3, false);
		ctx._lineTo( fFocusX,       fFocusY, false);
	ctx.stroke();

	ctx.font = "16px Georgia";
	ctx.fillText("th= " + rad2deg(2.0*fStartAngle).toPrecision(3) + String.fromCharCode(176),
                (fFocusX - 6)*fScaleGUI, (fFocusY - 6)*fScaleGUI);
                
    ctx.font = "16px Georgia";
    ctx.fillText("SphSegH= " + gSphSegH.toPrecision(2) + " mm",
                (iOx-20)*fScaleGUI, (iOy + 5)*fScaleGUI);
/* #endregion */


}

//44-(0.45*(44-8)*x*x)/(85*(85-x*(1-0.45)))

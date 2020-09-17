function sqr(val) {
    return val*val;
}

var RegionDStatic_W = 150; 		// mm
var RegionDStatic_H = 150;		// mm

var iCx = 75;					// mm
var iCy = 75;					// mm


function PrintSuperFishXY_DS(x, y)
{
var el = document.getElementById("DeflectionTextArea");
	el.value += "&po x=" + x.toPrecision(6) + ", y=" + (RegionDStatic_H*fScaleSuperFish - y).toPrecision(6) + " &\r\n";
}

function PrintSuperFishArc_DS(x, y, radius, start, end)
{
var el = document.getElementById("DeflectionTextArea");
    var xStart = x + radius*Math.cos(start);
    var yStart = y + radius*Math.sin(start);

	el.value += "&po x=" + xStart.toPrecision(6) + ", y=" + (RegionDStatic_H*fScaleSuperFish - yStart).toPrecision(6) + " &\r\n";
    el.value += "&po nt=2,r=" + radius.toPrecision(6) + ", theta=" + -rad2deg(end).toPrecision(6) +
                ", x0=" + x.toPrecision(6) + ", y0=" + y.toPrecision(6) + " &\r\n";
}

function PrintSuperFishCircle_DS(x, y, radius)
{
var el = document.getElementById("DeflectionTextArea");
    var xStart = x + radius;
    var yStart = y + 0;

	el.value += "&po x=" + xStart.toPrecision(6) + ", y=" + (RegionDStatic_H*fScaleSuperFish - yStart).toPrecision(6) + " &\r\n";
    el.value += "&po nt=2,r=" + radius.toPrecision(6) + ", theta=180.0" +
                ", x0=" + x.toPrecision(6) + ", y0=" + y.toPrecision(6) + " &\r\n";
    el.value += "&po nt=2,r=" + radius.toPrecision(6) + ", theta=360.0" +
                ", x0=" + x.toPrecision(6) + ", y0=" + y.toPrecision(6) + " &\r\n";
}


function _moveToDS(x,y, sf_output = true) {
	this.moveTo(x*fScaleGUI, y*fScaleGUI);									  // GUI
	
	if (sf_output) PrintSuperFishXY_DS(x*fScaleSuperFish, y*fScaleSuperFish); // SuperFish
}

function _lineToDS(x,y, sf_output = true) {
	this.lineTo(x*fScaleGUI, y*fScaleGUI);								      // GUI
	
	if (sf_output) PrintSuperFishXY_DS(x*fScaleSuperFish,y*fScaleSuperFish);  // SuperFish
}

function _arcDS(x,y, radius, fStart,fEnd, sf_output = true) {
	this.arc(x*fScaleGUI, y*fScaleGUI, radius*fScaleGUI, fStart, fEnd); 	  // GUI
	
	if (sf_output) PrintSuperFishArc_DS(x*fScaleSuperFish,y*fScaleSuperFish, radius*fScaleSuperFish, fStart, fEnd);  // SuperFish
}

function _circleDS(x,y, radius, sf_output = true) {
	this.arc(x*fScaleGUI, y*fScaleGUI, radius*fScaleGUI, 0.0, 2*Math.PI); 	  // GUI
	
	if (sf_output) PrintSuperFishCircle_DS(x*fScaleSuperFish,y*fScaleSuperFish, radius*fScaleSuperFish);  // SuperFish
}



function DrawGunDeflection()
{

var c = document.getElementById("DeflectionCanvas");
var ctx = c.getContext("2d");

	ctx._moveTo = _moveToDS;
    ctx._lineTo = _lineToDS;
    ctx._arc    = _arcDS;
    ctx._circle = _circleDS;
    
    ctx.clearRect(0, 0, c.width, c.height);

	var el = document.getElementById("DeflectionTextArea");

/* #region GUI params */
	var DeflCoilDistToGun    = parseFloat(document.getElementById("DeflCoilDistToGun").value);
	var DeflCoilHeight       = parseFloat(document.getElementById("DeflCoilHeight").value);
	var DeflCoilTotCurrent   = parseFloat(document.getElementById("DeflCoilTotCurrent").value);
	var DeflCoilAirGap       = parseFloat(document.getElementById("DeflCoilAirGap").value);
/* #endregion */

/* #region Print Superfish 1st region params */
	el.value  = "Magnetostatic problem\n";
	el.value += "\n";
	el.value += "&reg kprob=0,    ! Poisson or Pandira problem\n";
	el.value += "xjfact=1.0,      ! Magnetostatic problem (current scaler)\n";
	el.value += "dx=0.05,         ! Mesh interval\n";
	el.value += "icylin=0,        ! No cylindrical symmetry\n";
	el.value += "mode=-1,         ! FIXGAM is the default value of the reluctivity for materials with MAT = 2 and higher\n";
	el.value += "nbsup=0,         ! Dirichlet boundary condition at upper edge\n";
	el.value += "nbslo=0,         ! Dirichlet boundary condition at lower edge\n";
	el.value += "nbsrt=0,         ! Dirichlet boundary condition at right edge\n";
	el.value += "nbslf=0 &        ! Dirichlet boundary condition at left edge\n";
	el.value += "\n\n";
/* #endregion */

var iStart = iOy+EGUNHeight;	// mm   exact height where egun ends

/* #region Superfish 1st region */
	// PrintSuperFishXY_DS(0,                                0);
	// PrintSuperFishXY_DS(RegionDStatic_W*fScaleSuperFish,  0);
	// PrintSuperFishXY_DS(RegionDStatic_W*fScaleSuperFish,  RegionDStatic_H*fScaleSuperFish);
	// PrintSuperFishXY_DS(0,                                RegionDStatic_H*fScaleSuperFish);
	// PrintSuperFishXY_DS(0,                                0);
    // el.value += "\n\n";
    
    ctx.strokeStyle = "black";
	ctx.lineWidth = 1;
	ctx.beginPath();
        ctx._moveTo(0,               0);
        ctx._lineTo(RegionDStatic_W, 0);
        ctx._lineTo(RegionDStatic_W, RegionDStatic_H);
        ctx._lineTo(0,               RegionDStatic_H);
        ctx._lineTo(0,               0);
        el.value += "\n\n";
	ctx.stroke();
/* #endregion */

/* #region Coil */
    el.value += "&reg mat=2";
    el.value += " &\n";

    var fRadiusBig = 50;

    ctx.beginPath();
        ctx._circle(iCx, iCy, fRadiusBig, true);

        ctx.fillStyle = "Lavender";
		ctx.fill();
    ctx.stroke();

    // CORE
	el.value += "\n\n&reg mat=1";
	el.value += " &\n";

    var fDInnerCore = 30.5;                                // radius of the inner core circle
    var fDOutterCoreThickness = 9;                         // thickness of the core bulk
    var fDOuterCore = fRadiusBig - fDOutterCoreThickness;  // radius of the outter core circle
    var fChuckCoreHalfThickness = 2.0;                     // half thickness of the chuck

    var fAngleInnerCore    = Math.asin(fChuckCoreHalfThickness/fDInnerCore);
    var fAngleOuterCore    = Math.asin(fChuckCoreHalfThickness/fDOuterCore);
    var fChucksNumbQuarter = 3;
    var fAngleChucksD      = deg2rad(90/fChucksNumbQuarter);

    var AirGapAngle = Math.acos(1.0-sqr(DeflCoilAirGap)/(sqr(fRadiusBig)*2)); //deg2rad(1); // chord length = 2R*sin(a/2) => cos(a)= 1-L^2/2R^2
    
    var fAngleCur          = deg2rad(0);

    ctx.beginPath();
        ctx._moveTo(iCx + fDInnerCore*Math.cos(fAngleCur + fAngleInnerCore),
                    iCy + fDInnerCore*Math.sin(fAngleCur + fAngleInnerCore));              
        
        for (var iChuck=0; iChuck < fChucksNumbQuarter*4; iChuck++)
        {
            if ( (DeflCoilAirGap > 0) && ((iChuck===0) || (iChuck===6)) )   // a case when the core is split in half
            {
                ctx._arc(iCx, iCy, fDOuterCore, fAngleCur + fAngleOuterCore,                 fAngleCur + fAngleChucksD/2.0 - AirGapAngle, true);                
                ctx._arc(iCx, iCy, fRadiusBig,    fAngleCur + fAngleChucksD/2.0 - AirGapAngle, fAngleCur + fAngleChucksD/2.0 + AirGapAngle, true);                
                ctx._arc(iCx, iCy, fDOuterCore, fAngleCur + fAngleChucksD/2.0 + AirGapAngle, fAngleCur + fAngleChucksD - fAngleOuterCore, true);                
            }
            else
                ctx._arc(iCx, iCy, fDOuterCore, fAngleCur + fAngleOuterCore, fAngleCur + fAngleChucksD - fAngleOuterCore, true);

            fAngleCur += fAngleChucksD;
            ctx._lineTo(iCx + fDInnerCore*Math.cos(fAngleCur - fAngleInnerCore),
                        iCy + fDInnerCore*Math.sin(fAngleCur - fAngleInnerCore));       
            ctx._lineTo(iCx + fDInnerCore*Math.cos(fAngleCur + fAngleInnerCore),
                        iCy + fDInnerCore*Math.sin(fAngleCur + fAngleInnerCore));       
        }
        
        ctx.fillStyle = "White";
		ctx.fill();         
    ctx.stroke();

    // circle

    // el.value += "&reg mat=2";
    // el.value += " &\n";
    // ctx._circle(iCx, iCy, 29, true);

    // ctx.beginPath();
    // ctx._circle(iCx, iCy, 30, true);
    // ctx.fillStyle = "White";
	// ctx.fill();         
    // ctx.stroke();


    // COILS

    var fCoilSpacer = 1;                            // space between chuck and winding
    var fDInnerCoil = fDInnerCore + 2;              // radius of the inner circle of the coil
    var fDOuterCoil = fDOuterCore - fCoilSpacer;
    var fCoilHalfThickness = 4;                     // thickness of a coil winding

    var fAngleInnerCoilBase  = Math.atan((fChuckCoreHalfThickness + fCoilSpacer)/fDInnerCoil);
    var fAngleOuterCoilBase  = Math.atan((fChuckCoreHalfThickness + fCoilSpacer)/fDOuterCoil);
    var fAngleInnerCoilTop   = Math.atan((fChuckCoreHalfThickness + fCoilSpacer + fCoilHalfThickness)/fDInnerCoil);
    var fAngleOuterCoilTop   = Math.atan((fChuckCoreHalfThickness + fCoilSpacer + fCoilHalfThickness + 1)/fDOuterCoil);
    
    
    fAngleCur     = deg2rad(0);

    var Current;
    var aCurrent = [0.47*DeflCoilTotCurrent, 0.71*DeflCoilTotCurrent, 1.0*DeflCoilTotCurrent];

    for (var iChuck=0; iChuck < fChucksNumbQuarter*4; iChuck++)
    {
             if (iChuck==0)  Current =   0;
        else if (iChuck==1)  Current =   aCurrent[0];
        else if (iChuck==2)  Current =   aCurrent[1];
        else if (iChuck==3)  Current =   aCurrent[2];
        else if (iChuck==4)  Current =   aCurrent[1];
        else if (iChuck==5)  Current =   aCurrent[0];
        else if (iChuck==6)  Current =   0;
        else if (iChuck==7)  Current =  -aCurrent[0];
        else if (iChuck==8)  Current =  -aCurrent[1];
        else if (iChuck==9)  Current =  -aCurrent[2];
        else if (iChuck==10) Current =  -aCurrent[1];
        else if (iChuck==11) Current =  -aCurrent[0];

        el.value += "\n\n&reg mat=1, cur=";
        el.value += Current.toFixed(1);
        el.value += " &\n";

        fAngleCur = fAngleChucksD*iChuck;

        ctx.beginPath();
            ctx._moveTo(iCx + fDInnerCoil*Math.cos(fAngleCur + fAngleInnerCoilBase),
                        iCy + fDInnerCoil*Math.sin(fAngleCur + fAngleInnerCoilBase));              
        
            ctx._lineTo(iCx + fDOuterCoil*Math.cos(fAngleCur + fAngleOuterCoilBase),
                        iCy + fDOuterCoil*Math.sin(fAngleCur + fAngleOuterCoilBase));              
            
            ctx._lineTo(iCx + fDOuterCoil*Math.cos(fAngleCur + fAngleOuterCoilTop),
                        iCy + fDOuterCoil*Math.sin(fAngleCur + fAngleOuterCoilTop));       

            ctx._lineTo(iCx + fDInnerCoil*Math.cos(fAngleCur + fAngleInnerCoilTop),
                        iCy + fDInnerCoil*Math.sin(fAngleCur + fAngleInnerCoilTop));
            
            ctx._lineTo(iCx + fDInnerCoil*Math.cos(fAngleCur + fAngleInnerCoilBase),
                        iCy + fDInnerCoil*Math.sin(fAngleCur + fAngleInnerCoilBase));
        

        ctx.fillStyle = "YellowGreen";
        ctx.fill();
        ctx.stroke();
    }

    fAngleCur     = deg2rad(0);

    for (var iChuck=0; iChuck < fChucksNumbQuarter*4; iChuck++)
    {
        //if ((iChuck!=0) && (iChuck!=6)) continue;

             if (iChuck==0)  Current = -  0;
        else if (iChuck==1)  Current =  -aCurrent[0];
        else if (iChuck==2)  Current =  -aCurrent[1];
        else if (iChuck==3)  Current =  -aCurrent[2];
        else if (iChuck==4)  Current =  -aCurrent[1];
        else if (iChuck==5)  Current =  -aCurrent[0];
        else if (iChuck==6)  Current =    0;
        else if (iChuck==7)  Current =   aCurrent[0];
        else if (iChuck==8)  Current =   aCurrent[1];
        else if (iChuck==9)  Current =   aCurrent[2];
        else if (iChuck==10) Current =   aCurrent[1];
        else if (iChuck==11) Current =   aCurrent[0];




        el.value += "\n\n&reg mat=1, cur=";
        el.value += Current.toFixed(1);
        el.value += " &\n";

        fAngleCur = fAngleChucksD*iChuck;

        ctx.beginPath();
            ctx._moveTo(iCx + fDInnerCoil*Math.cos(fAngleCur - fAngleInnerCoilBase),
                        iCy + fDInnerCoil*Math.sin(fAngleCur - fAngleInnerCoilBase));              
        
            ctx._lineTo(iCx + fDOuterCoil*Math.cos(fAngleCur - fAngleOuterCoilBase),
                        iCy + fDOuterCoil*Math.sin(fAngleCur - fAngleOuterCoilBase));              
            
            ctx._lineTo(iCx + fDOuterCoil*Math.cos(fAngleCur - fAngleOuterCoilTop),
                        iCy + fDOuterCoil*Math.sin(fAngleCur - fAngleOuterCoilTop));       

            ctx._lineTo(iCx + fDInnerCoil*Math.cos(fAngleCur - fAngleInnerCoilTop),
                        iCy + fDInnerCoil*Math.sin(fAngleCur - fAngleInnerCoilTop));
            
            ctx._lineTo(iCx + fDInnerCoil*Math.cos(fAngleCur - fAngleInnerCoilBase),
                        iCy + fDInnerCoil*Math.sin(fAngleCur - fAngleInnerCoilBase));

        ctx.fillStyle = "YellowGreen";
        ctx.fill();
        ctx.stroke();
    }

/* #endregion */

/* #region Deflection coil */

    // RIGHT
    
    var DeflAbsPosY = iStart + DeflCoilDistToGun;
    document.getElementById("DeflAbsPosY").value = (RegionEStatic_H*fScaleSuperFish - DeflAbsPosY*fScaleSuperFish).toPrecision(3);

    var c = document.getElementById("FrontCanvas");
    var ctx = c.getContext("2d");

    ctx.beginPath();
        ctx._moveTo(iOx + fDInnerCore,      iStart + DeflCoilDistToGun - DeflCoilHeight, false);              
        ctx._lineTo(iOx + fRadiusBig,       iStart + DeflCoilDistToGun - DeflCoilHeight, false);       
        ctx._lineTo(iOx + fRadiusBig,       iStart + DeflCoilDistToGun, false); 
        ctx._lineTo(iOx + fDInnerCore,      iStart + DeflCoilDistToGun, false); 
        ctx._lineTo(iOx + fDInnerCore,      iStart + DeflCoilDistToGun - DeflCoilHeight, false); 
    ctx.stroke();

    // LEFT

    ctx.beginPath();
        ctx._moveTo(iOx - fDInnerCore,      iStart + DeflCoilDistToGun - DeflCoilHeight, false);              
        ctx._lineTo(iOx - fRadiusBig,       iStart + DeflCoilDistToGun - DeflCoilHeight, false);       
        ctx._lineTo(iOx - fRadiusBig,       iStart + DeflCoilDistToGun, false); 
        ctx._lineTo(iOx - fDInnerCore,      iStart + DeflCoilDistToGun, false); 
        ctx._lineTo(iOx - fDInnerCore,      iStart + DeflCoilDistToGun - DeflCoilHeight, false); 

	ctx.fillStyle = "YellowGreen";
	ctx.fill();

	ctx.stroke();

/* #endregion */


/* #region Beam Guide */

// RIGHT

    ctx.beginPath();
        ctx._moveTo(iOx + 15,      iStart, false);              
        ctx._lineTo(iOx + 22,      iStart, false);       
        ctx._lineTo(iOx + 22,      iStart + 9, false); 
        ctx._lineTo(iOx + 24,      iStart + 9, false); 
        ctx._lineTo(iOx + 24,      iStart + 125, false); 
        ctx._lineTo(iOx + 27,      iStart + 136, false); 
        ctx._lineTo(iOx + 50,      iStart + 136, false); 
        ctx._lineTo(iOx + 50,      iStart + 125, false); 
        ctx._lineTo(iOx + 55,      iStart + 125, false); 
        ctx._lineTo(iOx + 55,      iStart + 145, false); 
        ctx._lineTo(iOx + 31,      iStart + 145, false); 
        ctx._lineTo(iOx + 31,      iStart + 149, false); 
        ctx._lineTo(iOx + 20,      iStart + 149, false); 
        ctx._lineTo(iOx + 15,      iStart + 130, false); 
        ctx._lineTo(iOx + 15,      iStart, false); 
    ctx.stroke();

// LEFT

    ctx.beginPath();
        ctx._moveTo(iOx - 15,      iStart, false);              
        ctx._lineTo(iOx - 22,      iStart, false);       
        ctx._lineTo(iOx - 22,      iStart + 9, false); 
        ctx._lineTo(iOx - 24,      iStart + 9, false); 
        ctx._lineTo(iOx - 24,      iStart + 125, false); 
        ctx._lineTo(iOx - 27,      iStart + 136, false); 
        ctx._lineTo(iOx - 50,      iStart + 136, false); 
        ctx._lineTo(iOx - 50,      iStart + 125, false); 
        ctx._lineTo(iOx - 55,      iStart + 125, false); 
        ctx._lineTo(iOx - 55,      iStart + 145, false); 
        ctx._lineTo(iOx - 31,      iStart + 145, false); 
        ctx._lineTo(iOx - 31,      iStart + 149, false); 
        ctx._lineTo(iOx - 20,      iStart + 149, false); 
        ctx._lineTo(iOx - 15,      iStart + 130, false); 
        ctx._lineTo(iOx - 15,      iStart, false); 

    ctx.stroke();

/* #endregion */

}


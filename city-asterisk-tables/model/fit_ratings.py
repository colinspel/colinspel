import numpy as np, json
from scipy.optimize import minimize
T=[("MCI","Manchester City",6,0,0),("ARS","Arsenal",5,0,1),("BRI","Brighton",4,1,1),("BRE","Brentford",2,4,0),("EVE","Everton",2,4,0),("CFC","Chelsea",3,1,2),("LEE","Leeds",2,3,1),("HUL","Hull City",2,3,1),("LFC","Liverpool",2,3,1),("IPS","Ipswich",3,0,3),("NEW","Newcastle",2,2,2),("CRY","Crystal Palace",2,1,3),("MUN","Man United",1,3,2),("COV","Coventry",2,0,4),("NFO","Nott'm Forest",1,2,3),("AVL","Aston Villa",1,2,3),("SUN","Sunderland",1,1,4),("BOU","Bournemouth",0,3,3),("TOT","Tottenham",0,3,3),("FUL","Fulham",0,2,4)]
idx={t[0]:i for i,t in enumerate(T)}
pts=np.array([3*w+d for _,_,w,d,l in T]);gp=6
k=10; mean=1.37
shr=(pts+k*mean)/(gp+k); z=shr-shr.mean()
M=[("EVE","CFC",30.3,25.5,44.2),("BRE","LFC",39.9,25.4,34.7),("FUL","HUL",55.3,24,20.7),("MCI","IPS",79.1,12.8,8.1),("NEW","AVL",42.7,25.7,31.6),("BOU","SUN",45.8,26.6,27.6),("BRI","CRY",62.2,20.9,16.9),("LEE","MUN",39.6,26.2,34.2),("NFO","ARS",15.9,23.1,61),("TOT","COV",65.4,19.5,15.1)]
def probs(ri,rj,h,nu):
    a=np.exp(ri+h);b=np.exp(rj);d=nu*np.sqrt(a*b);s=a+b+d
    return np.array([a/s,d/s,b/s])
lam=1.5
def loss(p):
    r=p[:20]-p[:20].mean();h,lognu,beta=p[20],p[21],p[22]
    L=0
    for hm,aw,ph,pd,pa in M:
        q=np.array([ph,pd,pa])/100;m=probs(r[idx[hm]],r[idx[aw]],h,np.exp(lognu))
        L+=np.sum(q*np.log(q/m))
    L+=lam*np.sum((r-beta*z)**2)/20
    return L
p0=np.concatenate([np.zeros(20),[0.25,np.log(0.7),3.0]])
res=minimize(loss,p0,method="L-BFGS-B")
r=res.x[:20]-res.x[:20].mean();h,nu,beta=res.x[20],np.exp(res.x[21]),res.x[22]
print(res.fun,h,nu,beta)
for hm,aw,ph,pd,pa in M:
    print(hm,aw,(ph,pd,pa),np.round(100*probs(r[idx[hm]],r[idx[aw]],h,nu),1))
for i,t in enumerate(T): print(t[0],round(r[i],3),pts[i])
json.dump({"teams":[{"code":t[0],"name":t[1],"pts":int(pts[i]),"gp":gp,"r":round(float(r[i]),4)} for i,t in enumerate(T)],"h":round(float(h),4),"nu":round(float(nu),4)},open("ratings.json","w"),indent=1)
